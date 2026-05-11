import { HttpErrorResponse } from '@angular/common/http';
import { extrairMensagemErroApi } from './api-error-message.util';

describe('extrairMensagemErroApi', () => {
  it('deve usar message quando existir', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'Senha atual incorreta' },
    });
    expect(extrairMensagemErroApi(err, 'fallback')).toBe('Senha atual incorreta');
  });

  it('deve concatenar errors Zod quando não houver message', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: {
        errors: [
          { field: 'senhaNova', message: 'Nova senha não pode ser igual à senha atual' },
        ],
      },
    });
    expect(extrairMensagemErroApi(err, 'fallback')).toBe(
      'Nova senha não pode ser igual à senha atual',
    );
  });

  it('deve retornar fallback quando corpo vazio', () => {
    const err = new HttpErrorResponse({ status: 500, error: null });
    expect(extrairMensagemErroApi(err, 'fallback')).toBe('fallback');
  });
});
