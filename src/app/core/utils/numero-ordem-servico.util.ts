/**
 * Ano completo a partir dos 2 dígitos do ano no número da OS (mesma convenção comum em sistemas legados).
 */
function anoCompletoDeDoisDigitos(yy: number): number {
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

/**
 * Chave numérica monótona para ordenar números de OS (maior = mais recente / maior sequência no mesmo dia,
 * conforme os componentes da data).
 * Retorna `null` se o texto não casar com formatos conhecidos.
 */
export function chaveOrdenacaoNumeroOrdemServico(ref: string): number | null {
  const s = ref.trim();

  const novo = /^OS(\d{2})(\d{2})(\d{2})-(\d+)$/i.exec(s);
  if (novo) {
    const yyyy = anoCompletoDeDoisDigitos(parseInt(novo[1], 10));
    const mm = parseInt(novo[2], 10);
    const dd = parseInt(novo[3], 10);
    const seq = parseInt(novo[2], 10);
    return yyyy * 1_000_000_000 + mm * 10_000_000 + dd * 100_000 + seq;
  }

  const legadoData = /^OS(\d{8})-(\d+)$/.exec(s);
  if (legadoData) {
    const yyyymmdd = parseInt(legadoData[1], 10);
    const yyyy = Math.floor(yyyymmdd / 10_000);
    const mm = Math.floor((yyyymmdd % 10_000) / 100);
    const dd = yyyymmdd % 100;
    const seq = parseInt(legadoData[2], 10);
    return yyyy * 1_000_000_000 + mm * 10_000_000 + dd * 100_000 + seq;
  }

  const legadoAno = /^OS-(\d{4})-(\d+)$/.exec(s);
  if (legadoAno) {
    const yyyy = parseInt(legadoAno[1], 10);
    const seq = parseInt(legadoAno[2], 10);
    return yyyy * 1_000_000_000 + seq;
  }

  return null;
}

/**
 * Compara dois rótulos de número de OS (novo `OS260503-02`, legado `OS-20260503-0002`, `OS-2024-0891`).
 */
export function compararNumeroOrdemServico(a: string, b: string): number {
  const ka = chaveOrdenacaoNumeroOrdemServico(a);
  const kb = chaveOrdenacaoNumeroOrdemServico(b);
  if (ka !== null && kb !== null && ka !== kb) {
    return ka < kb ? -1 : 1;
  }
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}
