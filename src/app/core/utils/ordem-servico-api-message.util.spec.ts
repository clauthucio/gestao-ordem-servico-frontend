import { mensagemUsuarioErroApiOrdemServico } from './ordem-servico-api-message.util';

describe('mensagemUsuarioErroApiOrdemServico', () => {
  it('traduz erro conhecido de início imutável', () => {
    const msg = mensagemUsuarioErroApiOrdemServico(
      { error: { message: 'Data de início não pode ser alterada após ser definida' } },
      'fallback',
    );
    expect(msg).toContain('Não é possível alterar a data de início');
  });

  it('retorna mensagem da API quando não há mapeamento', () => {
    expect(
      mensagemUsuarioErroApiOrdemServico({ error: { message: 'Outro erro' } }, 'fallback'),
    ).toBe('Outro erro');
  });

  it('usa fallback quando não há mensagem', () => {
    expect(mensagemUsuarioErroApiOrdemServico({}, 'fallback')).toBe('fallback');
  });

  it('prioriza fieldErrors sobre message genérica', () => {
    const msg = mensagemUsuarioErroApiOrdemServico(
      {
        error: {
          message: 'Dados Inválidos',
          details: {
            fieldErrors: {
              statusOrdemServico: ['Para concluir uma OS, informe descrição do serviço e horas trabalhadas'],
            },
          },
        },
      },
      'fallback',
    );
    expect(msg).toContain('horas trabalhadas');
  });
});
