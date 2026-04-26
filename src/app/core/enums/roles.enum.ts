export enum UserRole {
  SOLICITANTE = 'SOLICITANTE',
  TECNICO = 'TECNICO',
  SUPERVISOR_DE_MANUTENCAO = 'SUPERVISOR_DE_MANUTENCAO',
  ADMIN = 'ADMIN',
}

//Mapping: papel → descrição em português
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SOLICITANTE]: 'Solicitante',
  [UserRole.TECNICO]: 'Técnico',
  [UserRole.SUPERVISOR_DE_MANUTENCAO]: 'Supervisor de Manutenção',
  [UserRole.ADMIN]: 'Administrador',
};
