import { UserRole } from '../enums/roles.enum';

//Dados do usuário logado
export interface User {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  perfilUsuario: UserRole; // SOLICITANTE, TECNICO, SUPERVISOR, ADMIN
  statusUsuario?: boolean;
}

//Estrutura real retornada pelo backend no login
export interface BackendLoginResponse {
  mensagem: string;
  dados: {
    accessToken: string;
    refreshToken: string;
    usuario: User;
  };
}

//Formato interno normalizado após parse da resposta
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

//Enviamos para o backend fazer login
export interface LoginRequest {
  emailUsuario: string;
  senhaUsuario: string;
}

//Resposta quando renova o token
export interface RefreshResponse {
  access_token: string;
}
