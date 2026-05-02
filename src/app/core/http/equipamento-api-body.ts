import type {
  AtualizarEquipamentoPayload,
  CriarEquipamentoPayload,
} from '../models/equipamento.model';
import { gerarCodigoEquipamento } from './equipamento-codigo';

/** Corpo JSON enviado ao POST/PUT — evita `null` em opcionais (muitos validadores rejeitam). */
export type EquipamentoApiBody = Record<string, string | boolean>;

function trimmed(v: string | null | undefined): string {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * POST /app/equipamentos — inclui `codigo` (obrigatório na API); gera se o payload não trouxer.
 * Opcionais `fabricante`/`modelo` só entram com texto (não envia `null`).
 */
export function toCriarEquipamentoApiBody(payload: CriarEquipamentoPayload): EquipamentoApiBody {
  const codigoInformado = trimmed(payload.codigo);
  const body: EquipamentoApiBody = {
    codigo: codigoInformado || gerarCodigoEquipamento(),
    nome: payload.nome.trim(),
    tipo: payload.tipo,
    localizacao: payload.localizacao.trim(),
    ativo: payload.ativo !== false,
  };
  const fab = trimmed(payload.fabricante);
  if (fab) body['fabricante'] = fab;
  const mod = trimmed(payload.modelo);
  if (mod) body['modelo'] = mod;
  return body;
}

/**
 * PUT /app/equipamentos/:id — inclui apenas chaves presentes no partial; opcionais vazios são omitidos.
 */
export function toAtualizarEquipamentoApiBody(
  payload: AtualizarEquipamentoPayload
): EquipamentoApiBody {
  const body: EquipamentoApiBody = {};
  if (payload.nome !== undefined) body['nome'] = payload.nome.trim();
  if (payload.tipo !== undefined) body['tipo'] = payload.tipo;
  if (payload.localizacao !== undefined) body['localizacao'] = payload.localizacao.trim();
  if (payload.ativo !== undefined) body['ativo'] = payload.ativo;
  if (payload.fabricante !== undefined && payload.fabricante !== null) {
    const fab = trimmed(payload.fabricante);
    if (fab) body['fabricante'] = fab;
  }
  if (payload.modelo !== undefined && payload.modelo !== null) {
    const mod = trimmed(payload.modelo);
    if (mod) body['modelo'] = mod;
  }
  return body;
}
