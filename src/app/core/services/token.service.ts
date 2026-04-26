 //Guardar e recuperar JWT do localStorage ("guardião" dos tokens)

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root', // Disponível em toda a app, único (Singleton)
})
export class TokenService {
  // Nomes das chaves no localStorage
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  //Salva o Access Token no localStorage
  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  //Recupera o Access Token do localStorage
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  //Salva o Refresh Token
  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  //Recupera o RefreshToken
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  //Salva os dados do usuário em JSON
  setUser(user: any): void {
    // JSON.stringify converte objeto → texto
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  //Recupera os dados do usuário
  getUser(): any {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson || userJson === 'undefined' || userJson === 'null') {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
    try {
      return JSON.parse(userJson);
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }


  //Verifica se existe token (está logado?)
  hasToken(): boolean {
    // !! converte qualquer valor para boolean
    // !!token = true se existe, false se null
    return !!this.getAccessToken();
  }


  //Limpa TUDO (usado no logout)
  clear(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
