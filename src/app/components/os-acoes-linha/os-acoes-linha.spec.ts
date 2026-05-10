import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OsAcoesLinhaComponent } from './os-acoes-linha';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';
import type { OrdemServico } from '../../core/models/ordem-servico.model';

describe('OsAcoesLinhaComponent', () => {
  function ordemBase(status: OrdemStatus): OrdemServico {
    return {
      idOrdemServico: 'os-x',
      numeroOrdemServico: 'OS241201-01',
      idEquipamento: 'eq-1',
      tipoManutencao: 'CORRETIVA',
      prioridadeOrdemServico: 'MEDIA',
      statusOrdemServico: status,
      descricaoFalha: 'Teste',
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsAcoesLinhaComponent],
      providers: [
        provideRouter([]),
        { provide: OrdemServicoService, useValue: { atualizar: () => of({}), deletar: () => of(void 0) } },
        {
          provide: AuthService,
          useValue: { getCurrentUser: () => ({ idUsuario: 'u1', perfilUsuario: UserRole.ADMIN }) },
        },
      ],
    }).compileComponents();
  });

  it('com status CANCELADO o menu exibe apenas Ver detalhes', () => {
    const fixture = TestBed.createComponent(OsAcoesLinhaComponent);
    const comp = fixture.componentInstance;
    comp.ordem = ordemBase(OrdemStatus.CANCELADO);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const acoesBtn = host.querySelector('button[title="Ações"]') as HTMLButtonElement;
    expect(acoesBtn).toBeTruthy();
    acoesBtn.click();
    fixture.detectChanges();

    const itens = host.querySelectorAll(
      '.absolute.right-0 button[type="button"]'
    ) as NodeListOf<HTMLButtonElement>;
    expect(itens.length).toBe(1);
    expect(itens[0].textContent?.replace(/\s+/g, ' ').trim()).toContain('Ver detalhes');
  });
});
