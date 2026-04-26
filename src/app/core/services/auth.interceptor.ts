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

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Injetar serviços
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);

  //Chamado em todas requisições
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // 1. Pegar o token
    const token = this.tokenService.getAccessToken();
    const isAuthRoute = request.url.includes('/auth/login') || request.url.includes('/auth/refresh');

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
        if (error.status === 401) {
          console.warn('Token expirado (401)');

          // Tentar renovar o token
          this.authService.refreshToken().subscribe({
            // Se conseguir renovar, tentar requisição novamente
            next: () => {
              // Aqui poderia reenviar a requisição com novo token
              // Por simplicidade, redireciona para login
            },
            // Se falhar na renovação, fazer logout
            error: () => {
              console.error('Não foi possível renovar token, fazendo logout');
              this.authService.logout().subscribe(() => {
                window.location.href = '/auth/login';
              });
            },
          });
        }

        // Repassar o erro para o componente lidar
        return throwError(() => error);
      })
    );
  }
}
