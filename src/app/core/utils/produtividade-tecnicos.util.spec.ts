import { OrdemStatus } from '../enums/status.enum';
import type { OrdemServico } from '../models/ordem-servico.model';
import {
  CHAVE_SEM_TECNICO,
  agruparAbertasPorEquipamento,
  aplicarFiltrosTipoPrioridade,
  calcularMediaTempoEsperaPecas,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
  criarLimitesPeriodoLocal,
  filtrarConcluidasOuCanceladasNoPeriodo,
  filtrarOrdensRelatorioNoPeriodo,
  filtrarOsConcluidasNoPeriodo,
  horasContabilizadasRelatorio,
  instanteParaFiltroPeriodoRelatorio,
  parseAberturaOuCriacaoMs,
  parseConclusaoMs,
  parseDataReferenciaMs,
} from './produtividade-tecnicos.util';

function os(overrides: Partial<OrdemServico> & Pick<OrdemServico, 'idOrdemServico'>): OrdemServico {
  return {
    numeroOrdemServico: 'N-1',
    idEquipamento: 'eq',
    tipoManutencao: 'CORRETIVA',
    prioridadeOrdemServico: 'MEDIA',
    statusOrdemServico: OrdemStatus.CONCLUIDO,
    descricaoFalha: 'Falha',
    aberturaEm: '2024-01-01',
    dataCriacao: '2024-01-01',
    dataAtualizacao: '2024-01-01',
    ...overrides,
  } as OrdemServico;
}

describe('produtividade-tecnicos.util', () => {
  it('parseConclusaoMs retorna null para undefined', () => {
    expect(parseConclusaoMs(undefined)).toBeNull();
  });

  it('parseDataReferenciaMs usa calendário local para yyyy-MM-dd', () => {
    const ms = parseDataReferenciaMs('2024-06-15');
    expect(ms).not.toBeNull();
    const d = new Date(ms!);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  it('criarLimitesPeriodoLocal inclui o dia final até 23:59:59', () => {
    const { inicioMs, fimMs } = criarLimitesPeriodoLocal('2024-06-10', '2024-06-10');
    const d0 = new Date(inicioMs);
    const d1 = new Date(fimMs);
    expect(d0.getHours()).toBe(0);
    expect(d1.getHours()).toBe(23);
    expect(d1.getMinutes()).toBe(59);
  });

  it('filtra só OS concluídas cuja data de conclusão está no período', () => {
    const { inicioMs, fimMs } = criarLimitesPeriodoLocal('2024-06-01', '2024-06-30');
    const lista: OrdemServico[] = [
      os({
        idOrdemServico: '1',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: '2024-06-15T12:00:00',
      }),
      os({
        idOrdemServico: '2',
        statusOrdemServico: OrdemStatus.ABERTO,
        conclusaoEm: '2024-06-15T12:00:00',
      }),
      os({
        idOrdemServico: '3',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: '2024-07-01T12:00:00',
      }),
      os({ idOrdemServico: '4', statusOrdemServico: OrdemStatus.CONCLUIDO }),
      os({
        idOrdemServico: '5',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: undefined,
        dataAtualizacao: '2024-06-20T12:00:00',
      }),
      os({
        idOrdemServico: '6',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: '2024-06-20T12:00:00',
      }),
    ];
    const r = filtrarOsConcluidasNoPeriodo(lista, inicioMs, fimMs);
    const ids = r.map((x) => x.idOrdemServico).sort();
    expect(ids).toEqual(['1', '6']);
  });

  it('filtrarOrdensRelatorioNoPeriodo inclui EM_ANDAMENTO pela dataAtualizacao', () => {
    const { inicioMs, fimMs } = criarLimitesPeriodoLocal('2024-06-01', '2024-06-30');
    const lista: OrdemServico[] = [
      os({
        idOrdemServico: '1',
        statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
        dataAtualizacao: '2024-06-15T10:00:00',
        aberturaEm: '2024-01-01',
      }),
      os({
        idOrdemServico: '2',
        statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
        dataAtualizacao: '2024-07-01T10:00:00',
        aberturaEm: '2024-06-01',
      }),
    ];
    const r = filtrarOrdensRelatorioNoPeriodo(lista, inicioMs, fimMs, [OrdemStatus.EM_ANDAMENTO]);
    expect(r.map((x) => x.idOrdemServico)).toEqual(['1']);
  });

  it('computarProdutividadePorTecnico com status EM_ANDAMENTO usa dataAtualizacao no período', () => {
    const aggs = computarProdutividadePorTecnico(
      [
        os({
          idOrdemServico: '1',
          idTecnico: 't1',
          tecnicoNome: 'Um',
          statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
          dataAtualizacao: '2024-06-15',
          horasTrabalhadas: 3,
        }),
      ],
      '2024-06-01',
      '2024-06-30',
      [OrdemStatus.EM_ANDAMENTO],
    );
    expect(aggs).toHaveLength(1);
    expect(aggs[0].osConcluidas).toBe(1);
    expect(aggs[0].horasTotais).toBe(3);
  });

  it('computarProdutividadePorTecnico inclui todos os tipos no mesmo período', () => {
    const aggs = computarProdutividadePorTecnico(
      [
        os({
          idOrdemServico: '1',
          idTecnico: 't1',
          tecnicoNome: 'Um',
          tipoManutencao: 'PREVENTIVA',
          conclusaoEm: '2024-06-05',
        }),
        os({
          idOrdemServico: '2',
          idTecnico: 't1',
          tecnicoNome: 'Um',
          tipoManutencao: 'CORRETIVA',
          conclusaoEm: '2024-06-10',
        }),
      ],
      '2024-06-01',
      '2024-06-30',
    );
    expect(aggs).toHaveLength(1);
    expect(aggs[0].osConcluidas).toBe(2);
  });

  it('aplicarFiltrosTipoPrioridade respeita tipo e prioridade', () => {
    const lista: OrdemServico[] = [
      os({
        idOrdemServico: '1',
        tipoManutencao: 'PREVENTIVA',
        prioridadeOrdemServico: 'ALTA',
      }),
      os({
        idOrdemServico: '2',
        tipoManutencao: 'CORRETIVA',
        prioridadeOrdemServico: 'ALTA',
      }),
    ];
    const r = aplicarFiltrosTipoPrioridade(lista, 'PREVENTIVA', '');
    expect(r).toHaveLength(1);
    expect(r[0].idOrdemServico).toBe('1');
  });

  it('agrupa sem técnico em CHAVE_SEM_TECNICO', () => {
    const lista: OrdemServico[] = [
      os({
        idOrdemServico: '1',
        idTecnico: undefined,
        tecnicoNome: undefined,
        horasTrabalhadas: 2,
        conclusaoEm: '2024-06-01T10:00:00',
      }),
    ];
    const aggs = computarProdutividadePorTecnico(lista, '2024-01-01', '2024-12-31');
    expect(aggs).toHaveLength(1);
    expect(aggs[0].chaveTecnico).toBe(CHAVE_SEM_TECNICO);
    expect(aggs[0].horasTotais).toBe(2);
    expect(aggs[0].mediaHorasPorOs).toBe(2);
  });

  it('horasContabilizadasRelatorio para CONCLUIDO sem horasTrabalhadas estima líquido (elapsed menos aguardando peça)', () => {
    const o = os({
      idOrdemServico: 'z',
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      aberturaEm: '2024-06-10T08:00:00',
      inicioEm: '2024-06-10T08:00:00',
      conclusaoEm: '2024-06-10T13:00:00',
      horasAguardandoPecaAcumuladas: 1,
    });
    expect(horasContabilizadasRelatorio(o)).toBe(4);
  });

  it('horasContabilizadasRelatorio para CONCLUIDO com horasTrabalhadas desconta horasAguardandoPecaAcumuladas (contrato API)', () => {
    const o = os({
      idOrdemServico: 'z',
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      horasTrabalhadas: 10,
      horasAguardandoPecaAcumuladas: 2.5,
      aberturaEm: '2024-06-10T08:00:00',
      inicioEm: '2024-06-10T08:00:00',
      conclusaoEm: '2024-06-10T13:00:00',
    });
    expect(horasContabilizadasRelatorio(o)).toBe(7.5);
    const semAguardar = { ...o, horasAguardandoPecaAcumuladas: undefined };
    expect(horasContabilizadasRelatorio(semAguardar)).toBe(10);
  });

  it('horasContabilizadasRelatorio para status não concluído usa intervalo quando horasTrabalhadas está ausente', () => {
    const o = os({
      idOrdemServico: 'z',
      statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
      aberturaEm: '2024-06-10T08:00:00',
      inicioEm: '2024-06-10T08:00:00',
      conclusaoEm: '2024-06-10T13:00:00',
    });
    expect(horasContabilizadasRelatorio(o)).toBe(5);
  });

  it('parseAberturaOuCriacaoMs usa dataCriacao quando aberturaEm está ausente', () => {
    const o = os({
      idOrdemServico: 'x',
      aberturaEm: undefined,
      dataCriacao: '2024-06-15',
    });
    expect(parseAberturaOuCriacaoMs(o)).toBe(parseDataReferenciaMs('2024-06-15'));
  });

  it('computarProdutividadePorTecnico soma fallback líquido para CONCLUIDO sem horasTrabalhadas da API', () => {
    const o = os({
      idOrdemServico: '1',
      idTecnico: 't1',
      tecnicoNome: 'Um',
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      aberturaEm: '2024-06-10T08:00:00',
      inicioEm: '2024-06-10T08:00:00',
      conclusaoEm: '2024-06-10T13:00:00',
    });
    const aggs = computarProdutividadePorTecnico([o], '2024-06-01', '2024-06-30');
    expect(aggs[0].horasTotais).toBe(5);
    expect(aggs[0].mediaHorasPorOs).toBe(5);
  });

  it('horasContabilizadasRelatorio para CANCELADO usa horasTotaisAteCancelamento da API quando existir', () => {
    const o = os({
      idOrdemServico: 'c1',
      statusOrdemServico: OrdemStatus.CANCELADO,
      inicioEm: '2024-06-10T08:00:00',
      dataAtualizacao: '2024-06-10T18:00:00',
      horasTotaisAteCancelamento: 9.5,
    });
    expect(horasContabilizadasRelatorio(o)).toBe(9.5);
  });

  it('horasContabilizadasRelatorio para CANCELADO sem campo dedicado usa intervalo início até conclusão ou atualização (inclui aguardando)', () => {
    const o = os({
      idOrdemServico: 'c2',
      statusOrdemServico: OrdemStatus.CANCELADO,
      inicioEm: '2024-06-10T08:00:00',
      conclusaoEm: '2024-06-10T18:00:00',
      horasAguardandoPecaAcumuladas: 2,
    });
    expect(horasContabilizadasRelatorio(o)).toBe(10);
  });

  it('instanteParaFiltroPeriodoRelatorio para CANCELADO usa conclusaoEm ou dataAtualizacao', () => {
    const { inicioMs, fimMs } = criarLimitesPeriodoLocal('2024-06-01', '2024-06-30');
    const cancelada = os({
      idOrdemServico: 'cx',
      statusOrdemServico: OrdemStatus.CANCELADO,
      conclusaoEm: '2024-06-15T12:00:00',
      dataAtualizacao: '2024-07-01T12:00:00',
    });
    expect(instanteParaFiltroPeriodoRelatorio(cancelada)).toBe(parseDataReferenciaMs('2024-06-15T12:00:00'));
    const lista = filtrarOrdensRelatorioNoPeriodo([cancelada], inicioMs, fimMs, [OrdemStatus.CANCELADO]);
    expect(lista).toHaveLength(1);
  });

  it('calcularResumoGlobal soma técnicos', () => {
    const aggs = computarProdutividadePorTecnico(
      [
        os({
          idOrdemServico: 'a',
          idTecnico: 't1',
          tecnicoNome: 'Um',
          horasTrabalhadas: 4,
          conclusaoEm: '2024-03-10',
        }),
        os({
          idOrdemServico: 'b',
          idTecnico: 't1',
          tecnicoNome: 'Um',
          horasTrabalhadas: 2,
          conclusaoEm: '2024-03-11',
        }),
      ],
      '2024-03-01',
      '2024-03-31',
    );
    const res = calcularResumoGlobal(aggs);
    expect(res.totalOs).toBe(2);
    expect(res.totalHoras).toBe(6);
    expect(res.mediaHorasPorOsGlobal).toBe(3);
    expect(res.tecnicosComOs).toBe(1);
  });

  it('agruparAbertasPorEquipamento conta só ABERTO no período e média de horas', () => {
    const lista = [
      os({
        idOrdemServico: '1',
        idEquipamento: 'e1',
        equipamentoNome: 'Prensa',
        statusOrdemServico: OrdemStatus.ABERTO,
        horasTrabalhadas: 4,
        dataAtualizacao: '2024-06-15T10:00:00',
      }),
      os({
        idOrdemServico: '2',
        idEquipamento: 'e1',
        equipamentoNome: 'Prensa',
        statusOrdemServico: OrdemStatus.ABERTO,
        horasTrabalhadas: 2,
        dataAtualizacao: '2024-06-16T10:00:00',
      }),
      os({
        idOrdemServico: '3',
        idEquipamento: 'e1',
        equipamentoNome: 'Prensa',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: '2024-06-15T10:00:00',
      }),
    ];
    const ag = agruparAbertasPorEquipamento(lista, '2024-06-01', '2024-06-30');
    expect(ag).toHaveLength(1);
    expect(ag[0].quantidade).toBe(2);
    expect(ag[0].nomeExibicao).toBe('Prensa');
    expect(ag[0].mediaHorasPorOrdemServico).toBe(3);
  });

  it('filtrarConcluidasOuCanceladasNoPeriodo não duplica id', () => {
    const lista = [
      os({
        idOrdemServico: '1',
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        conclusaoEm: '2024-06-15T12:00:00',
      }),
    ];
    const r = filtrarConcluidasOuCanceladasNoPeriodo(lista, '2024-06-01', '2024-06-30');
    expect(r).toHaveLength(1);
  });

  it('calcularMediaTempoEsperaPecas ignora zeros e calcula média', () => {
    const lista = [
      os({ idOrdemServico: 'a', horasAguardandoPecaAcumuladas: 4 }),
      os({ idOrdemServico: 'b', horasAguardandoPecaAcumuladas: 2 }),
      os({ idOrdemServico: 'c', horasAguardandoPecaAcumuladas: 0 }),
    ];
    const m = calcularMediaTempoEsperaPecas(lista);
    expect(m.osNoUniverso).toBe(3);
    expect(m.osComEsperaRegistada).toBe(2);
    expect(m.mediaHoras).toBe(3);
  });
});
