import { UserRole } from '../enums/roles.enum';

/** Payload do POST de cadastro de usuário (admin). */
export interface CadastrarUsuarioPayload {
  nome: string;
  email: string;
  perfil: string;
  status: string;
  senhaTemporaria: string;
}

export interface Usuario {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  perfilUsuario: UserRole;
  statusUsuario: boolean;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
  /** Se o backend devolver na listagem admin, exibe na tela de usuários. */
  senhaTemporaria?: string;
}

/** Corpo parcial do PUT /app/usuarios/:id (espelha `UsuarioUpdateSchema.partial()` no backend). */
export interface AtualizarUsuarioPayload {
  nomeUsuario?: string;
  emailUsuario?: string;
  perfilUsuario?: string;
  statusUsuario?: boolean;
}

/** PATCH /app/usuarios/:id/senha — apenas o próprio utilizador autenticado. */
export interface AlterarSenhaRequest {
  senhaAtual: string;
  senhaNova: string;
}

export interface AlterarSenhaResponse {
  message?: string;
  usuario?: {
    idUsuario?: string;
    nomeUsuario?: string;
    emailUsuario?: string;
  };
}
