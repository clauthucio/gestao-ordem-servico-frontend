import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai mensagem legível de erros da API (`message` simples ou lista Zod em `errors`).
 */
export function extrairMensagemErroApi(err: HttpErrorResponse, fallback: string): string {
  const body = err.error;
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (typeof o['message'] === 'string' && o['message'].trim()) {
      return o['message'].trim();
    }
    const errors = o['errors'];
    if (Array.isArray(errors)) {
      const msgs = errors
        .map((e) => {
          if (e !== null && typeof e === 'object' && 'message' in e) {
            return String((e as { message: unknown }).message).trim();
          }
          return '';
        })
        .filter((s) => s.length > 0);
      if (msgs.length > 0) {
        return msgs.join(' ');
      }
    }
  }
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  return fallback;
}
