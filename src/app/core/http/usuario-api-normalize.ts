import { UserRole } from '../enums/roles.enum';
import { Usuario } from '../models/usuario.model';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * GET /app/usuarios: array direto ou envelope (ex. `{ dados: [...] }` como no login).
 */
export function extrairItensUsuariosBrutos(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const o = asRecord(body);
  if (!o) return [];
  for (const key of ['dados', 'data', 'usuarios', 'items'] as const) {
    const v = o[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function toBoolStatus(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    if (s === 'ATIVO' || s === 'TRUE' || s === '1' || s === 'ACTIVE') return true;
    if (s === 'INATIVO' || s === 'FALSE' || s === '0' || s === 'INACTIVE') return false;
  }
  if (typeof v === 'number') return v !== 0;
  return false;
}

/** Item da API (camelCase ou snake_case) → `Usuario`. */
export function mapBrutoParaUsuario(raw: unknown): Usuario {
  const r = asRecord(raw) ?? {};
  const id = String(r['idUsuario'] ?? r['id_usuario'] ?? '').trim();
  const nome = String(r['nomeUsuario'] ?? r['nome_usuario'] ?? '').trim();
  const email = String(r['emailUsuario'] ?? r['email_usuario'] ?? r['email'] ?? '').trim();
  const perfilRaw = String(r['perfilUsuario'] ?? r['perfil_usuario'] ?? r['perfil'] ?? '').trim();
  const statusRaw = r['statusUsuario'] ?? r['status_usuario'] ?? r['status'];
  const dataCriacao = (r['dataCriacao'] ?? r['data_criacao'] ?? '') as Date | string;
  const dataAtualizacao = (r['dataAtualizacao'] ?? r['data_atualizacao'] ?? dataCriacao) as Date | string;
  const senhaRaw = r['senhaTemporaria'] ?? r['senha_temporaria'];

  const perfilValido = (Object.values(UserRole) as string[]).includes(perfilRaw)
    ? (perfilRaw as UserRole)
    : UserRole.SOLICITANTE;

  const u: Usuario = {
    idUsuario: id,
    nomeUsuario: nome,
    emailUsuario: email,
    perfilUsuario: perfilValido,
    statusUsuario: toBoolStatus(statusRaw),
    dataCriacao,
    dataAtualizacao,
  };
  if (typeof senhaRaw === 'string' && senhaRaw.length > 0) {
    u.senhaTemporaria = senhaRaw;
  }
  return u;
}

export function normalizarListaUsuarios(body: unknown): Usuario[] {
  return extrairItensUsuariosBrutos(body).map(mapBrutoParaUsuario);
}
