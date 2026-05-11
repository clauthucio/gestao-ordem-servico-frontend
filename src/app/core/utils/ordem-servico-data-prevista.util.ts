/**
 * Converte valor de `<input type="date">` (`yyyy-MM-dd`) em ISO 8601 no fim do dia **local**
 * para envio como `dataPrevistaConclusao` (timestamptz no servidor).
 */
export function dataPrevistaFormYmdParaIsoFimDoDiaLocal(dataYmd: string): string | null {
  const t = dataYmd?.trim();
  if (!t) return null;
  const parts = t.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString();
}

/** Valor `yyyy-MM-dd` para **hoje** (início do dia no calendário local), p.ex. `[attr.min]` em `<input type="date">`. */
export function dataPrevistaMinYmdLocal(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const mo = String(ref.getMonth() + 1).padStart(2, '0');
  const d = String(ref.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** `true` se a data (só dia, local) for estritamente anterior ao início do dia de hoje (local). */
export function dataPrevistaYmdEhAnteriorAHoje(dataYmd: string): boolean {
  const t = dataYmd?.trim();
  if (!t) return false;
  const parts = t.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false;
  const [y, mo, d] = parts;
  const escolhido = new Date(y, mo - 1, d);
  escolhido.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return escolhido.getTime() < hoje.getTime();
}
