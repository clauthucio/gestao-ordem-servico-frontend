// Bloqueaa acesso a rotas se o usuário não está logado

import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  // Injetar serviços
  private authService = inject(AuthService);
  private router = inject(Router);

  //canActivate é chamado ANTES de entrar em uma rota
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Se está logado, deixa entrar
    if (this.authService.isLoggedIn()) {
      console.log('Acesso permitido.');
      return true;
    }

    // Se NÃO está logado, redireciona para login
    console.warn('Acesso negado, redirecionando para login.');
    this.router.navigate(['/auth/login']);
    return false;
  }
}
