import { TestBed } from '@angular/core/testing';

import { OsAcoesLinhaMenuService } from './os-acoes-linha-menu.service';

describe('OsAcoesLinhaMenuService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(OsAcoesLinhaMenuService).close();
  });

  it('select abre e select no mesmo id fecha', () => {
    const s = TestBed.inject(OsAcoesLinhaMenuService);
    s.select('os-1');
    expect(s.openOrdemServicoId()).toBe('os-1');
    s.select('os-1');
    expect(s.openOrdemServicoId()).toBeNull();
  });

  it('select em outro id substitui o menu aberto', () => {
    const s = TestBed.inject(OsAcoesLinhaMenuService);
    s.select('os-a');
    s.select('os-b');
    expect(s.openOrdemServicoId()).toBe('os-b');
  });

  it('mousedown fora do host fecha o menu', () => {
    const s = TestBed.inject(OsAcoesLinhaMenuService);
    s.select('os-x');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(s.openOrdemServicoId()).toBeNull();
  });

  it('mousedown dentro do host com data-os-id correspondente não fecha', () => {
    const s = TestBed.inject(OsAcoesLinhaMenuService);
    const host = document.createElement('app-os-acoes-linha');
    host.setAttribute('data-os-id', 'os-z');
    const inner = document.createElement('button');
    host.appendChild(inner);
    document.body.appendChild(host);
    s.select('os-z');
    inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(s.openOrdemServicoId()).toBe('os-z');
    host.remove();
    s.close();
  });
});
