import { UserRole } from '../enums/roles.enum';

//Dados do usuário logado
export interface User {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  perfilUsuario: UserRole; // SOLICITANTE, TECNICO, SUPERVISOR, ADMIN
  statusUsuario: boolean;
}

//Resposta do backend quando fazemos login
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
