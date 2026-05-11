import { UserRole } from '../enums/roles.enum';

/** Utilizador mínimo para checagem de permissão nas ações da OS (lista/detalhe). */
export interface UsuarioPermissaoOsAcao {
  idUsuario: string;
  perfilUsuario: UserRole;
}

/**
 * ADMIN pode; TÉCNICO só se for o técnico atribuído à OS.
 * Mesma regra que `isUserAdminOrAssignedTecnico` na lista de OS.
 */
export function usuarioPodeAcaoComoAdminOuTecnicoAtribuido(
  usuario: UsuarioPermissaoOsAcao | null | undefined,
  idTecnicoOs: string | null | undefined,
): boolean {
  if (!usuario) return false;
  if (usuario.perfilUsuario === UserRole.ADMIN) return true;
  const idT = idTecnicoOs?.trim();
  if (usuario.perfilUsuario === UserRole.TECNICO && usuario.idUsuario === idT) return true;
  return false;
}

/** Perfil TÉCNICO não edita nem exclui pela UI (lista/detalhe). */
export function usuarioPodeEditarOuExcluirOrdemServico(
  usuario: UsuarioPermissaoOsAcao | null | undefined,
): boolean {
  return usuario?.perfilUsuario !== UserRole.TECNICO;
}

/**
 * Iniciar atendimento: perfis não-técnicos mantêm acesso; TÉCNICO só com OS atribuída a si.
 */
export function iniciarAtendimentoHabilitadoParaUsuario(
  usuario: UsuarioPermissaoOsAcao | null | undefined,
  idTecnicoOs: string | null | undefined,
): boolean {
  if (!usuario || usuario.perfilUsuario !== UserRole.TECNICO) return true;
  const idT = idTecnicoOs?.trim() ?? '';
  return idT !== '' && usuario.idUsuario === idT;
}
