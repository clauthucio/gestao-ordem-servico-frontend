import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { RelatoriosOs } from './relatorios-os';

describe('RelatoriosOs', () => {
  let component: RelatoriosOs;
  let fixture: ComponentFixture<RelatoriosOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatoriosOs],
      providers: [{ provide: OrdemServicoService, useValue: { listar: () => of([]) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título do relatório', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Relatório de Produtividade por Técnico');
  });
});
