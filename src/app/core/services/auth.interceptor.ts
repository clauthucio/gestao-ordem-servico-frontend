//Adiciona Authorization header em TODAS as requisições HTTP após o login

import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Injetar serviços
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private router = inject(Router);

  //Chamado em todas requisições
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // 1. Pegar o token
    const token = this.tokenService.getAccessToken();
    const isAuthRoute =
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/refresh') ||
      request.url.includes('/auth/logout');

    // 2. Se existe token e não é rota de auth, adicionar header
    if (token && !isAuthRoute) {
      // HttpRequest é imutável (não pode modificar direto), precisa clonar e depois modificar
      request = request.clone({
        setHeaders: {
          // Adicionar Authorization header
          // Formato padrão: "Bearer <token>"
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Header adicionado:', request.headers.get('Authorization'));
    }

    // 3. Passar a requisição adiante (com ou sem header)
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Só tenta renovar token se NÃO for rota de auth (evita loop infinito)
        if (error.status === 401 && !isAuthRoute) {
          console.warn('Token expirado (401), tentando renovar...');

          this.authService.refreshToken().subscribe({
            next: () => {
              // Token renovado — redireciona para que o usuário repita a ação
              // (reenvio da requisição original fica fora do escopo por simplicidade)
            },
            error: () => {
              // Refresh falhou: limpar sessão e redirecionar sem reload de página
              console.error('Não foi possível renovar token, redirecionando para login');
              this.tokenService.clear();
              this.router.navigate(['/auth/login']);
            },
          });
        }

        // Repassar o erro para o componente lidar
        return throwError(() => error);
      })
    );
  }
}
