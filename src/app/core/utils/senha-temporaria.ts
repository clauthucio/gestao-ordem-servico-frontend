const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const DIGITOS = '23456789';
const ESPECIAIS = '@#$%&*!?';

function randomInt(exclusiveMax: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % exclusiveMax;
}

function sortearDe(pool: string): string {
  return pool[randomInt(pool.length)]!;
}

/**
 * Gera senha temporária com no mínimo 8 caracteres, incluindo
 * maiúscula, minúscula, número e caractere especial (embaralhada).
 */
export function gerarSenhaTemporaria(comprimentoMinimo = 8): string {
  const n = Math.max(comprimentoMinimo, 12);
  const obrigatorios = [
    sortearDe(MAIUSCULAS),
    sortearDe(MINUSCULAS),
    sortearDe(DIGITOS),
    sortearDe(ESPECIAIS),
  ];
  const poolCompleto = MAIUSCULAS + MINUSCULAS + DIGITOS + ESPECIAIS;
  const restante: string[] = [];
  for (let i = obrigatorios.length; i < n; i++) {
    restante.push(sortearDe(poolCompleto));
  }
  const chars = [...obrigatorios, ...restante];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
