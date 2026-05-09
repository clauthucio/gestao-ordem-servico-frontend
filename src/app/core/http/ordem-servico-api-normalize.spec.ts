import { mapBrutoParaOrdemServico } from './ordem-servico-api-normalize';

describe('mapBrutoParaOrdemServico', () => {
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
});
