import {
  dataPrevistaFormYmdParaIsoFimDoDiaLocal,
  dataPrevistaMinYmdLocal,
  dataPrevistaYmdEhAnteriorAHoje,
} from './ordem-servico-data-prevista.util';

describe('ordem-servico-data-prevista.util', () => {
  it('dataPrevistaFormYmdParaIsoFimDoDiaLocal retorna ISO no fim do dia local', () => {
    const iso = dataPrevistaFormYmdParaIsoFimDoDiaLocal('2026-05-20');
    expect(iso).toBeTruthy();
    expect(iso!.endsWith('Z') || iso!.includes('+')).toBe(true);
  });

  it('dataPrevistaYmdEhAnteriorAHoje é false para string vazia', () => {
    expect(dataPrevistaYmdEhAnteriorAHoje('')).toBe(false);
  });

  it('dataPrevistaMinYmdLocal retorna yyyy-MM-dd coerente com a data local', () => {
    const ref = new Date(2026, 4, 10);
    expect(dataPrevistaMinYmdLocal(ref)).toBe('2026-05-10');
  });

  it('dataPrevistaMinYmdLocal padroniza mês e dia com dois dígitos', () => {
    const ref = new Date(2026, 0, 7);
    expect(dataPrevistaMinYmdLocal(ref)).toBe('2026-01-07');
  });
});
