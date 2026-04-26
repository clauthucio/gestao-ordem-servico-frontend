
import { UserRole } from '../enums/roles.enum';

export interface Usuario {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  perfilUsuario: UserRole;
  statusUsuario: boolean;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
}
