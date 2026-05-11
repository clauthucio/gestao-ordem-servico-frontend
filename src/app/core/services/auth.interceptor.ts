//Adiciona Authorization header em TODAS as requisições HTTP após o login

import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpContextToken,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/** Evita loop: uma única tentativa de refresh + reenvio por requisição original. */
const AUTH_REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);

function extractApiMessage(error: HttpErrorResponse): string {
  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object') {
    const o = body as { message?: unknown; erro?: unknown };
    if (typeof o.message === 'string') return o.message;
    if (typeof o.erro === 'string') return o.erro;
  }
  return '';
}

/**
 * 400/403 com mensagem que indica falha de auth (token/sessão), não validação de negócio.
 * Deve coincidir com o ramo authLike em catchError — evita tratar "Dados inválidos" como sessão expirada.
 */
function isAuthLikeClientErrorMessage(message: string): boolean {
  return /token|jwt|bearer|n[aã]o fornecid|autoriza/i.test(message);
}

/**
 * Alguns backends devolvem 5xx com corpo de auth (ex.: {"message":"Token não fornecido"}) em vez de 401.
 * Nesse caso tentamos refresh + reenvio como para 401, desde que a mensagem seja claramente de autenticação
 * (evita refresh em "Erro Interno" genérico).
 */
function isAuthFailureRecoverableWithRefresh(
  error: HttpErrorResponse,
  message: string
): boolean {
  if (error.status === 401) return true;
  if (error.status === 400 || error.status === 403) {
    return isAuthLikeClientErrorMessage(message);
  }
  if (error.status >= 500 && error.status <= 599) {
    return isAuthLikeClientErrorMessage(message);
  }
  return false;
}

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
    // login e refresh ainda não têm token — não adicionar header
    const skipAddToken =
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/refresh');
    // nenhuma rota de auth deve entrar no loop de renovação de token
    const skip401Retry =
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/refresh') ||
      request.url.includes('/auth/logout');

    // 2. Se existe token e não é rota que dispensa token, adicionar header
    if (token && !skipAddToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // 3. Passar a requisição adiante (com ou sem header)
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!(error instanceof HttpErrorResponse) || skip401Retry) {
          return throwError(() => error);
        }

        const alreadyRetried = request.context.get(AUTH_REFRESH_RETRIED);
        const msg = extractApiMessage(error);
        const canTryRefresh =
          !alreadyRetried &&
          isAuthFailureRecoverableWithRefresh(error, msg) &&
          !!this.tokenService.getRefreshToken();

        if (canTryRefresh) {
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = this.tokenService.getAccessToken();
              if (!newToken) {
                this.endSessionAndRedirect();
                return throwError(() => error);
              }
              const retry = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
                context: request.context.set(AUTH_REFRESH_RETRIED, true),
              });
              return next.handle(retry);
            }),
            catchError(() => {
              this.endSessionAndRedirect();
              return throwError(() => error);
            })
          );
        }

        const authLike =
          error.status === 401 ||
          ((error.status === 400 || error.status === 403) &&
            isAuthLikeClientErrorMessage(msg)) ||
          (error.status >= 500 &&
            error.status <= 599 &&
            isAuthLikeClientErrorMessage(msg));

        if (authLike && !skip401Retry) {
          const hasRefresh = !!this.tokenService.getRefreshToken();
          if (alreadyRetried || !hasRefresh) {
            this.endSessionAndRedirect();
          }
        }

        return throwError(() => error);
      })
    );
  }

  private endSessionAndRedirect(): void {
    this.authService.clearSessionLocal();
    void this.router.navigate(['/auth/login'], {
      queryParams: { sessao: 'expirada' },
    });
  }
}
