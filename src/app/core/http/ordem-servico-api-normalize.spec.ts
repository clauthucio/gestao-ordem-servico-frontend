import { mapBrutoParaAguardandoPecaLogResponse, mapBrutoParaOrdemServico } from './ordem-servico-api-normalize';

describe('mapBrutoParaOrdemServico', () => {
  it('mapeia total_horas_trabalhadas para horasTrabalhadas', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CONCLUIDO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      total_horas_trabalhadas: 8.5,
    });
    expect(o.horasTrabalhadas).toBe(8.5);
  });

  it('mapeia tempo_atendimento_minutos para horasTrabalhadas (conversão h)', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CONCLUIDO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      tempo_atendimento_minutos: 90,
    });
    expect(o.horasTrabalhadas).toBe(1.5);
  });

  it('prioriza horas explícitas sobre minutos quando ambos existem', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CONCLUIDO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      horas_trabalhadas: 3,
      tempo_atendimento_minutos: 999,
    });
    expect(o.horasTrabalhadas).toBe(3);
  });

  it('mapeia data_inicio para inicioEm', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'ABERTO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      data_inicio: '2024-06-15T10:00:00.000Z',
    });
    expect(o.inicioEm).toBe('2024-06-15T10:00:00.000Z');
  });

  it('mapeia horas acumuladas em aguardando peça e início do período atual', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CONCLUIDO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      horas_aguardando_peca_acumuladas: 2.5,
      aguardando_peca_desde: '2024-06-01T10:00:00.000Z',
    });
    expect(o.horasAguardandoPecaAcumuladas).toBe(2.5);
    expect(o.aguardandoPecaDesde).toBe('2024-06-01T10:00:00.000Z');
  });

  it('mapeia horas_totais_ate_cancelamento para horasTotaisAteCancelamento', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CANCELADO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      horas_totais_ate_cancelamento: 12.25,
    });
    expect(o.horasTotaisAteCancelamento).toBe(12.25);
  });

  it('mapeia data_prevista_conclusao para dataPrevistaConclusao', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'ABERTO',
      descricao_falha: 'x',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      data_prevista_conclusao: '2026-05-20T18:00:00.000Z',
    });
    expect(o.dataPrevistaConclusao).toBe('2026-05-20T18:00:00.000Z');
  });

  it('mapeia dataInicio (camelCase) para inicioEm', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numeroOrdemServico: 'N-1',
      idEquipamento: 'e',
      tipoManutencao: 'CORRETIVA',
      prioridadeOrdemServico: 'MEDIA',
      statusOrdemServico: 'ABERTO',
      descricaoFalha: 'x',
      aberturaEm: '2024-01-01',
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
      dataInicio: '2024-07-01T12:00:00.000Z',
    });
    expect(o.inicioEm).toBe('2024-07-01T12:00:00.000Z');
  });

  it('mapeia total_horas_aguardando para horasAguardandoPecaAcumuladas', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'CONCLUIDO',
      descricao_falha: 'x',
      abertura_em: '2024-01-01',
      data_criacao: '2024-01-01',
      data_atualizacao: '2024-01-01',
      total_horas_aguardando: 3.25,
    });
    expect(o.horasAguardandoPecaAcumuladas).toBe(3.25);
  });

  it('sem aberturaEm na API: preenche dataCriacao e omite aberturaEm no modelo', () => {
    const o = mapBrutoParaOrdemServico({
      id: '1',
      numero_ordem_servico: 'N-1',
      id_equipamento: 'e',
      tipo_manutencao: 'CORRETIVA',
      prioridade_ordem_servico: 'MEDIA',
      status_ordem_servico: 'ABERTO',
      descricao_falha: 'x',
      data_criacao: '2025-03-01T10:00:00.000Z',
      data_atualizacao: '2025-03-01T10:00:00.000Z',
    });
    expect(o.dataCriacao).toBe('2025-03-01T10:00:00.000Z');
    expect(o.aberturaEm).toBeUndefined();
  });
});

describe('mapBrutoParaAguardandoPecaLogResponse', () => {
  it('normaliza logs e total', () => {
    const r = mapBrutoParaAguardandoPecaLogResponse({
      total_horas_aguardando: 5,
      logs: [
        {
          aguardando_peca_inicio: '2024-06-01T10:00:00.000Z',
          aguardando_peca_fim: '2024-06-02T10:00:00.000Z',
          horas_aguardando_peca: 5,
        },
      ],
    });
    expect(r.totalHorasAguardando).toBe(5);
    expect(r.logs.length).toBe(1);
    expect(r.logs[0].aguardandoPecaInicio).toBe('2024-06-01T10:00:00.000Z');
  });

  it('soma horas dos logs quando total omitido', () => {
    const r = mapBrutoParaAguardandoPecaLogResponse({
      logs: [
        {
          aguardando_peca_inicio: '2024-06-01T10:00:00.000Z',
          horas_aguardando_peca: 2,
        },
        {
          aguardando_peca_inicio: '2024-06-05T10:00:00.000Z',
          horas_aguardando_peca: 3,
        },
      ],
    });
    expect(r.totalHorasAguardando).toBe(5);
  });

  it('mapeia idOrdemServico e dataCriacao no envelope e nos itens (Fase 6)', () => {
    const osId = '550e8400-e29b-41d4-a716-446655440000';
    const r = mapBrutoParaAguardandoPecaLogResponse({
      id_ordem_servico: osId,
      totalHorasAguardando: 0.003,
      logs: [
        {
          id_log: '550e8400-e29b-41d4-a716-446655440001',
          aguardando_peca_inicio: '2026-05-10T07:59:53.174-04:00',
          aguardando_peca_fim: '2026-05-10T08:00:04.921-04:00',
          horas_aguardando_peca: 0.003,
          data_criacao: '2026-05-10T07:59:53.175-04:00',
        },
      ],
    });
    expect(r.idOrdemServico).toBe(osId);
    expect(r.logs[0].idOrdemServico).toBe(osId);
    expect(r.logs[0].dataCriacao).toBe('2026-05-10T07:59:53.175-04:00');
    expect(r.logs[0].horasAguardandoPeca).toBe(0.003);
  });
});
