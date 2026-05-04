/**
 * Código para POST /app/equipamentos (backend exige `codigo` string).
 * Formato: `{YYYYMMDD}-{sequência}` — data local + contador diário em `localStorage`.
 * - Sequência 001–999: apenas algarismos (3 dígitos).
 * - A partir de 1000: sufixo em hexadecimal (0–9 e A–F), largura mínima 4, sem colidir com 001–999.
 */

const STORAGE_KEY = 'equipamento.codigoSeq.v2';

interface StoredSeq {
  /** Chave do dia `YYYYMMDD` */
  d: string;
  /** Contador no dia (1-based) */
  n: number;
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function readStored(): StoredSeq {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { d: '', n: 0 };
    const o = JSON.parse(raw) as Partial<StoredSeq>;
    if (typeof o.d === 'string' && typeof o.n === 'number') return { d: o.d, n: o.n };
  } catch {
    /* ignore */
  }
  return { d: '', n: 0 };
}

function writeStored(s: StoredSeq): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function formatarSequencia(n: number): string {
  if (n <= 999) {
    return String(n).padStart(3, '0');
  }
  let h = n.toString(16).toUpperCase();
  if (h.length < 4) {
    h = h.padStart(4, '0');
  }
  return h;
}

export function gerarCodigoEquipamento(now = new Date()): string {
  const day = yyyymmdd(now);
  let { d, n } = readStored();
  if (d !== day) {
    d = day;
    n = 0;
  }
  n += 1;
  writeStored({ d, n });
  return `${day}-${formatarSequencia(n)}`;
}

/** Só para testes: repõe o estado persistido. */
export function resetCodigoEquipamentoSeqParaTestes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
