/**
 * Eventos de transição (aguardar peça / retomar) gravados no cliente para exibir na timeline
 * quando a API não expõe histórico detalhado.
 */
export type OsTimelineStoredKind = 'AGUARDANDO_PECA' | 'RETOMADA';

export interface OsTimelineStoredEvent {
  kind: OsTimelineStoredKind;
  /** ISO 8601 */
  em: string;
  autorNome: string;
}

const PREFIX = 'gestao-os-timeline-v1-';

function isStoredEvent(x: unknown): x is OsTimelineStoredEvent {
  if (!x || typeof x !== 'object') return false;
  const o = x as OsTimelineStoredEvent;
  return (
    (o.kind === 'AGUARDANDO_PECA' || o.kind === 'RETOMADA') &&
    typeof o.em === 'string' &&
    typeof o.autorNome === 'string'
  );
}

function parseList(raw: string | null): OsTimelineStoredEvent[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(isStoredEvent);
  } catch {
    return [];
  }
}

export function appendOsTimelineEvent(
  osId: string,
  kind: OsTimelineStoredKind,
  autorNome: string,
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = PREFIX + osId;
    const list = parseList(localStorage.getItem(key));
    list.push({ kind, em: new Date().toISOString(), autorNome });
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getOsTimelineEvents(osId: string): OsTimelineStoredEvent[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    return parseList(localStorage.getItem(PREFIX + osId));
  } catch {
    return [];
  }
}
