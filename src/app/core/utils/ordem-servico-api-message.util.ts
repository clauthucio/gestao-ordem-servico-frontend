function extrairMensagemHttp(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'error' in err) {
    const e = (err as { error?: Record<string, unknown> }).error;
    if (e && typeof e === 'object') {
      const details = e['details'] as
        | { fieldErrors?: Record<string, string[]>; formErrors?: unknown[] }
        | undefined;
      const formErrs = details?.formErrors;
      if (Array.isArray(formErrs) && formErrs.length > 0) {
        const msgs = formErrs.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
        if (msgs.length > 0) return msgs.join(' ');
      }
      const fe = details?.fieldErrors;
      if (fe && typeof fe === 'object') {
        const msgs = Object.values(fe)
          .flat()
          .filter((x): x is string => typeof x === 'string' && x.trim() !== '');
        if (msgs.length > 0) return msgs.join(' ');
      }
      const m = e['message'];
      if (typeof m === 'string' && m.trim() !== '') return m.trim();
    }
  }
  return '';
}

/** Mensagem amigável para erros conhecidos da API de ordens de serviço. */
export function mensagemUsuarioErroApiOrdemServico(err: unknown, fallback: string): string {
  const raw = extrairMensagemHttp(err);
  if (!raw) return fallback;
  if (raw.includes('Data de início não pode ser alterada')) {
    return 'Não é possível alterar a data de início após iniciar o atendimento.';
  }
  return raw;
}
