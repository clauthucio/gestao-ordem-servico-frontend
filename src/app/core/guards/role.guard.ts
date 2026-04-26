//Bloquea acesso a rotas se o usuário não tem o role necessário

import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/roles.enum';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Pegar o role necessário da rota (armazenado em route.data)
    const requiredRole = route.data['requiredRole'] as UserRole;

    // Se não tem um role necessário definido, deixa entrar
    if (!requiredRole) {
      return true;
    }

    // Verificar se user tem o role necessário
    if (this.authService.hasRole(requiredRole)) {
      console.log(`Acesso permitido ao perfil de: ${requiredRole})`);
      return true;
    }

    // Se não tem o role, negar acesso
    console.warn(`Acesso negado, necessário logar com perfil: ${requiredRole})`);
    this.router.navigate(['/dashboard']);
    return false;
  }
}
