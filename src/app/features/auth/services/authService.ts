import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface Usuario {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  perfilUsuario: string;
}

interface LoginResponse {
  mensagem: string;
  dados: {
    accessToken: string;      // Token curto
    refreshToken: string;     // Token longo
    usuario: Usuario;         // Dados do usuário logado
  };
}

interface RefreshResponse {
  mensagem: string;
  dados: {
    accessToken: string;
    refreshToken: string;
    usuario: Usuario;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // 1 - Fazer Login
  login(emailUsuario: string, senhaUsuario: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`,
      { emailUsuario, senhaUsuario}
    ).pipe(
      tap((response) => { // Tap = fazer algo com a resposta sem altera-la
        this.saveAccessToken(response.dados.accessToken);
        this.saveRefreshToken(response.dados.refreshToken);
        this.saveUser(response.dados.usuario);
      })
    );
  }

  // 2 - Salvar accesToken no localStorage
  private saveAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  // 3 - Salvar refreshToken no localStorage
  private saveRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }

  // 4 - Salvar dados do usuário no localStorage
  private saveUser(user: Usuario): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // 5: Obter accessToken do localStorage
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // 6: Obter refreshToken do localStorage
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // 7: Obter dados do usuário do localStorage
  getUser(): Usuario | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // 8: Verificar se está autenticado (tem accessToken válido)
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  // 9: Renovar o accessToken usando o refreshToken
  refresh(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<RefreshResponse>(
      `${this.apiUrl}/auth/refresh`, // URL do endpoint de refresh
      { refreshToken: refreshToken } // Enviar o token longo
    ).pipe(
      // Quando conseguir novos tokens, salvar tudo novamente
      tap((response) => {
        this.saveAccessToken(response.dados.accessToken);
        this.saveRefreshToken(response.dados.refreshToken);
        this.saveUser(response.dados.usuario);
      })
    );
  }

  // 10: Fazer logout (limpar tudo do localStorage)
  logout(): void {
       localStorage.removeItem('accessToken'); // Remove token curto
    localStorage.removeItem('refreshToken'); // Remove token longo
    localStorage.removeItem('user');         // Remove dados do usuário
  }
}





