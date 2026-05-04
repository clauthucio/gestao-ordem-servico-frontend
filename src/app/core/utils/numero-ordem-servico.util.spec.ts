import {
  chaveOrdenacaoNumeroOrdemServico,
  compararNumeroOrdemServico,
} from './numero-ordem-servico.util';

describe('numero-ordem-servico.util', () => {
  describe('chaveOrdenacaoNumeroOrdemServico', () => {
    it('parseia formato novo OSyymmdd-nn', () => {
      expect(chaveOrdenacaoNumeroOrdemServico('OS260503-02')).not.toBeNull();
      expect(chaveOrdenacaoNumeroOrdemServico('OS260503-02')).toBeLessThan(
        chaveOrdenacaoNumeroOrdemServico('OS260503-10')!,
      );
    });

    it('ordena por data antes do sequencial (dois dias distintos)', () => {
      const a = chaveOrdenacaoNumeroOrdemServico('OS260502-99');
      const b = chaveOrdenacaoNumeroOrdemServico('OS260503-01');
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a!).toBeLessThan(b!);
    });

    it('suporta legado OS-yyyymmdd-seq', () => {
      const k = chaveOrdenacaoNumeroOrdemServico('OS-20260503-0002');
      expect(k).not.toBeNull();
    });

    it('suporta legado OS-ano-seq', () => {
      expect(chaveOrdenacaoNumeroOrdemServico('OS-2024-0891')).not.toBeNull();
    });
  });

  describe('compararNumeroOrdemServico', () => {
    it('coloca dia anterior antes do seguinte mesmo com seq maior no primeiro', () => {
      expect(compararNumeroOrdemServico('OS260502-99', 'OS260503-01')).toBeLessThan(0);
    });

    it('usa localeCompare quando formato desconhecido', () => {
      expect(compararNumeroOrdemServico('XYZ', 'ABC')).toBeGreaterThan(0);
    });
  });
});
