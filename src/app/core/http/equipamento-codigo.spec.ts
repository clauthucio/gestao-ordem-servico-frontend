import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  gerarCodigoEquipamento,
  resetCodigoEquipamentoSeqParaTestes,
} from './equipamento-codigo';

describe('gerarCodigoEquipamento', () => {
  beforeEach(() => {
    resetCodigoEquipamentoSeqParaTestes();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 2, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetCodigoEquipamentoSeqParaTestes();
  });

  it('usa formato YYYYMMDD-001, 002, ... no mesmo dia', () => {
    expect(gerarCodigoEquipamento()).toBe('20260402-001');
    expect(gerarCodigoEquipamento()).toBe('20260402-002');
    expect(gerarCodigoEquipamento()).toBe('20260402-003');
  });

  it('reinicia sequência quando muda o dia', () => {
    expect(gerarCodigoEquipamento()).toBe('20260402-001');
    vi.setSystemTime(new Date(2026, 3, 3, 10, 0, 0));
    expect(gerarCodigoEquipamento()).toBe('20260403-001');
  });

  it('após 999 passa a hexadecimal com A-F (1000 -> 03E8)', () => {
    const raw = localStorage.getItem('equipamento.codigoSeq.v2');
    const st = JSON.parse(raw ?? '{}') as { d: string; n: number };
    st.d = '20260402';
    st.n = 999;
    localStorage.setItem('equipamento.codigoSeq.v2', JSON.stringify(st));
    expect(gerarCodigoEquipamento()).toBe('20260402-03E8');
  });
});
