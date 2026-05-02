import { describe, it, expect } from 'vitest';

import {
  toAtualizarEquipamentoApiBody,
  toCriarEquipamentoApiBody,
} from './equipamento-api-body';

/** YYYYMMDD + sufixo decimal 3 posições ou hex (0-9A-F) */
const codigoAutoRegex = /^\d{8}-[0-9A-F]+$/;

describe('toCriarEquipamentoApiBody', () => {
  it('gera codigo padronizado quando não informado', () => {
    const body = toCriarEquipamentoApiBody({
      nome: '  Motor X  ',
      tipo: 'ELETRICO',
      localizacao: ' Bloco A ',
      fabricante: null,
      modelo: '',
      ativo: true,
    });
    expect(body['codigo']).toMatch(codigoAutoRegex);
    expect(body).toMatchObject({
      nome: 'Motor X',
      tipo: 'ELETRICO',
      localizacao: 'Bloco A',
      ativo: true,
    });
    expect('fabricante' in body).toBe(false);
    expect('modelo' in body).toBe(false);
  });

  it('usa codigo do payload quando informado', () => {
    const body = toCriarEquipamentoApiBody({
      codigo: '  PAT-999  ',
      nome: 'Bomba',
      tipo: 'HIDRAULICO',
      localizacao: 'Piso 1',
      ativo: true,
    });
    expect(body['codigo']).toBe('PAT-999');
  });

  it('inclui fabricante e modelo quando preenchidos', () => {
    const body = toCriarEquipamentoApiBody({
      nome: 'Bomba',
      tipo: 'HIDRAULICO',
      localizacao: 'Piso 1',
      fabricante: ' ACME ',
      modelo: ' B-200 ',
      ativo: false,
    });
    expect(body['codigo']).toMatch(codigoAutoRegex);
    expect(body['fabricante']).toBe('ACME');
    expect(body['modelo']).toBe('B-200');
    expect(body['ativo']).toBe(false);
  });
});

describe('toAtualizarEquipamentoApiBody', () => {
  it('omite fabricante/modelo quando null ou só espaços', () => {
    const body = toAtualizarEquipamentoApiBody({
      nome: 'Novo nome',
      tipo: 'MECANICO',
      localizacao: 'Galpão',
      fabricante: null,
      modelo: '   ',
      ativo: true,
    });
    expect(body['nome']).toBe('Novo nome');
    expect(body['tipo']).toBe('MECANICO');
    expect(body['localizacao']).toBe('Galpão');
    expect(body['ativo']).toBe(true);
    expect('fabricante' in body).toBe(false);
    expect('modelo' in body).toBe(false);
  });
});
