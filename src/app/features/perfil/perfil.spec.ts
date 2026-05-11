import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Perfil } from './perfil';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { User } from '../../core/models/auth.model';
import { UserRole } from '../../core/enums/roles.enum';

describe('Perfil', () => {
  const usuarioApiOk = {
    idUsuario: 'u1',
    nomeUsuario: 'Teste',
    emailUsuario: 'teste@pim.com',
    perfilUsuario: UserRole.TECNICO,
    statusUsuario: true,
    dataCriacao: '2020-01-01',
    dataAtualizacao: '2020-01-01',
  };

  function configure(user: User) {
    const authStub = {
      getCurrentUser: (): User => user,
      syncCurrentUserFromServer: vi.fn(),
      currentUser$: of(user),
    };
    const usuarioStub = {
      atualizar: vi.fn().mockReturnValue(of(usuarioApiOk)),
      alterarSenha: vi.fn().mockReturnValue(of({ message: 'Senha alterada com sucesso' })),
    };
    const navigate = vi.fn();
    const routerStub = { navigate };

    TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: UsuarioService, useValue: usuarioStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, navigate };
  }

  it('deve criar', () => {
    const user: User = {
      idUsuario: 'u1',
      nomeUsuario: 'Admin',
      emailUsuario: 'admin@pim.com',
      perfilUsuario: UserRole.ADMIN,
    };
    const { component } = configure(user);
    expect(component).toBeTruthy();
  });

  it('deve deixar e-mail somente leitura para não administrador', () => {
    const user: User = {
      idUsuario: 'u1',
      nomeUsuario: 'Técnico',
      emailUsuario: 'tec@pim.com',
      perfilUsuario: UserRole.TECNICO,
    };
    const { fixture } = configure(user);
    const input = fixture.nativeElement.querySelector('#pf-email') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.readOnly).toBe(true);
  });

  it('deve permitir edição do e-mail para administrador', () => {
    const user: User = {
      idUsuario: 'u1',
      nomeUsuario: 'Admin',
      emailUsuario: 'admin@pim.com',
      perfilUsuario: UserRole.ADMIN,
    };
    const { fixture } = configure(user);
    const input = fixture.nativeElement.querySelector('#pf-email') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.readOnly).toBe(false);
  });

  it('deve redirecionar ao login se não houver usuário', () => {
    const navigate = vi.fn();
    const authStub = {
      getCurrentUser: (): User | null => null,
      syncCurrentUserFromServer: vi.fn(),
      currentUser$: of(null),
    };
    TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: UsuarioService, useValue: { atualizar: vi.fn().mockReturnValue(of(usuarioApiOk)), alterarSenha: vi.fn() } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
