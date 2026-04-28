import { Component } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

// Faz requisições HTTP para autenticação (intermediário entre o componente de login e o backend)
// LoginComponent → AuthService → HttpClient → Backend

import {
  LoginRequest,
  LoginResponse,
  BackendLoginResponse,
  BackendRefreshResponse,
  User,
  RefreshResponse,
} from '../models/auth.model';
import { TokenService } from './token.service';
import { UserRole } from '../enums/roles.enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // URL base do backend
  private readonly API_URL = 'http://localhost:3000';

  // Injetar serviços
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

   //BehaviorSubject = Observable que guarda um valor
  private currentUserSubject = new BehaviorSubject<User | null>(
    this.tokenService.getUser()
  );

  public currentUser$ = this.currentUserSubject.asObservable();

  /**LOGIN
   * 1. Envia email + senha para backend
   * 2. Backend valida e retorna token + user
   * 3. Salvamos tudo no localStorage
   * 4. Notificamos componentes que user mudou
   */

  login(emailUsuario: string, senhaUsuario: string): Observable<LoginResponse> {
    const loginRequest: LoginRequest = { emailUsuario, senhaUsuario };

    return this.http
      .post<BackendLoginResponse>(`${this.API_URL}/auth/login`, loginRequest)
      .pipe(
        // map = transforma a resposta do backend no formato interno
        map((backendResponse: BackendLoginResponse): LoginResponse => ({
          access_token: backendResponse.dados.accessToken,
          refresh_token: backendResponse.dados.refreshToken,
          user: backendResponse.dados.usuario,
        })),

        // tap = executa algo sem modificar o fluxo
        tap((response: LoginResponse) => {
          // 1. Salvar token
          console.log('Resposta completa do backend:', response);
          this.tokenService.setAccessToken(response.access_token);

          // 2. Se tiver refresh token, salvar também
          if (response.refresh_token) {
            this.tokenService.setRefreshToken(response.refresh_token);
          }

          // 3. Salvar dados do usuário
          this.tokenService.setUser(response.user);

          // 4. Notificar que o usuário mudou (atualiza navbar, etc)
          this.currentUserSubject.next(response.user);

          console.log('Login realizado com sucesso!', response.user);
        }),

        // catchError = tratar erros
        catchError((error) => {
          console.error('Erro no login:', error);
          return throwError(() => error);
        })
      );
  }

  /* LOGOUT
   * Fluxo:
   * 1. Avisar backend (opcional, depende da implementação)
   * 2. Limpar localStorage
   * 3. Notificar que user é null (navbar desaparece)*/

  logout(): Observable<any> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http
      .post(`${this.API_URL}/auth/logout`, { refreshToken })
      .pipe(
        tap(() => {
          // Limpar tudo
          this.tokenService.clear();

          // Notificar que deslogou
          this.currentUserSubject.next(null);

          console.log('Logout realizado com sucesso!');
        }),
        catchError((error) => {
          // Mesmo se backend falhar, faz logout localmente
          this.tokenService.clear();
          this.currentUserSubject.next(null);
          return throwError(() => error);
        })
      );
  }

   //RENOVA TOKEN
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = this.tokenService.getRefreshToken();

    return this.http
      .post<BackendRefreshResponse>(`${this.API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        // map = transforma a resposta do backend no formato interno
        map((backendResponse: BackendRefreshResponse): RefreshResponse => ({
          access_token: backendResponse.dados.accessToken,
        })),
        tap((response: RefreshResponse) => {
          // Atualizar token
          this.tokenService.setAccessToken(response.access_token);
          console.log('Token renovado com sucesso!');
        }),
        catchError((error) => {
          // Se refresh falhar, limpar sessão sem nova requisição HTTP
          this.tokenService.clear();
          this.currentUserSubject.next(null);
          return throwError(() => error);
        })
      );
  }

  //Método para autenticar e não aparecer a side bar no login
  isAuthenticated(): boolean {
  return this.currentUserSubject.value !== null;
}

  getCurrentUser(): User | null {
    return this.tokenService.getUser();
  }

  getCurrentUserRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user ? user.perfilUsuario : null;
  }

  //VERIFICA SE ESTÁ LOGADO
  isLoggedIn(): boolean {
    return this.tokenService.hasToken() && this.getCurrentUser() !== null;
  }

  //OBTER TOKEN
  getToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  //VALIDA SE USER TEM UM ROLE ESPECÍFICO
  hasRole(requiredRole: UserRole | UserRole[]): boolean {
    const userRole = this.getCurrentUserRole();

    if (!userRole) return false;

    // Se requiredRole é array, verifica se user tem algum deles
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }

    // Se é string, verifica igualdade
    return userRole === requiredRole;
  }
}
