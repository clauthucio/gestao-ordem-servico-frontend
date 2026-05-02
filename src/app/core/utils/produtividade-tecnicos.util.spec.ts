import { OrdemStatus } from '../enums/status.enum';
import type { OrdemServico } from '../models/ordem-servico.model';
import {
  CHAVE_SEM_TECNICO,
  aplicarFiltrosTipoPrioridade,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
  criarLimitesPeriodoLocal,
  filtrarOsConcluidasNoPeriodo,
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

  it('filtra CONCLUIDO no período por conclusaoEm ou dataAtualizacao', () => {
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
    ];
    const r = filtrarOsConcluidasNoPeriodo(lista, inicioMs, fimMs);
    const ids = r.map((x) => x.idOrdemServico).sort();
    expect(ids).toEqual(['1', '5']);
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
      }),
    ];
    const aggs = computarProdutividadePorTecnico(lista, '2024-01-01', '2024-12-31', '', '');
    expect(aggs).toHaveLength(1);
    expect(aggs[0].chaveTecnico).toBe(CHAVE_SEM_TECNICO);
    expect(aggs[0].horasTotais).toBe(2);
    expect(aggs[0].mediaHorasPorOs).toBe(2);
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
      '',
      '',
    );
    const res = calcularResumoGlobal(aggs);
    expect(res.totalOs).toBe(2);
    expect(res.totalHoras).toBe(6);
    expect(res.mediaHorasPorOsGlobal).toBe(3);
    expect(res.tecnicosComOs).toBe(1);
  });
});
