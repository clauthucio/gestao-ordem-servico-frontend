import { OrdemStatus } from '../enums/status.enum';
import type { ManutencaoType, OrdemServico, PrioridadeType } from '../models/ordem-servico.model';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function normToken(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickOptionalStr(r: Record<string, unknown>, ...keys: string[]): string | undefined {
  const s = pickStr(r, ...keys);
  return s === '' ? undefined : s;
}

function pickNum(r: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.replace(',', '.'));
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickDateLike(r: Record<string, unknown>, ...keys: string[]): Date | string {
  for (const k of keys) {
    const v = r[k];
    if (v instanceof Date) return v;
    if (typeof v === 'string' && v.trim() !== '') return v;
    if (typeof v === 'number' && !Number.isNaN(v)) return new Date(v).toISOString();
  }
  return '';
}

function pickOptionalDate(r: Record<string, unknown>, ...keys: string[]): Date | string | undefined {
  const d = pickDateLike(r, ...keys);
  if (d === '') return undefined;
  return d;
}

function normStatus(raw: unknown): OrdemStatus {
  const s = normToken(raw);
  const valid = Object.values(OrdemStatus) as string[];
  if (valid.includes(s)) return s as OrdemStatus;
  if (s === 'FINALIZADA' || s === 'FINALIZADO' || s === 'CONCLUIDA') return OrdemStatus.CONCLUIDO;
  if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED' || s === 'ENCERRADA' || s === 'ENCERRADO')
    return OrdemStatus.CONCLUIDO;
  return OrdemStatus.ABERTO;
}

function normManutencao(raw: unknown): ManutencaoType {
  const s = normToken(raw);
  if (s === 'PREVENTIVA' || s === 'CORRETIVA' || s === 'PREDITIVA') return s as ManutencaoType;
  return 'CORRETIVA';
}

function normPrioridade(raw: unknown): PrioridadeType {
  const s = normToken(raw);
  if (s === 'BAIXA' || s === 'MEDIA' || s === 'ALTA' || s === 'CRITICA') return s as PrioridadeType;
  return 'MEDIA';
}

/**
 * Item da API (camelCase ou snake_case) → `OrdemServico` (igual ao padrão de `usuario-api-normalize`).
 */
export function mapBrutoParaOrdemServico(raw: unknown): OrdemServico {
  const r = asRecord(raw) ?? {};
  const statusRaw =
    r['statusOrdemServico'] ??
    r['status_ordem_servico'] ??
    r['statusOrdem'] ??
    r['status_ordem'] ??
    r['status'] ??
    r['situacao'] ??
    r['estado'];

  const aberturaEm =
    pickDateLike(r, 'aberturaEm', 'abertura_em', 'dataAbertura', 'data_abertura') ||
    pickDateLike(r, 'dataCriacao', 'data_criacao');

  const dataCriacao =
    pickDateLike(r, 'dataCriacao', 'data_criacao') || aberturaEm || pickDateLike(r, 'createdAt', 'created_at');

  const dataAtualizacao =
    pickDateLike(r, 'dataAtualizacao', 'data_atualizacao', 'updatedAt', 'updated_at') ||
    dataCriacao ||
    aberturaEm;

  const o: OrdemServico = {
    idOrdemServico: pickStr(r, 'idOrdemServico', 'id_ordem_servico', 'id'),
    numeroOrdemServico:
      pickStr(r, 'numeroOrdemServico', 'numero_ordem_servico', 'numeroOs', 'numero_os', 'numero') ||
      pickStr(r, 'idOrdemServico', 'id_ordem_servico', 'id'),
    idEquipamento: pickStr(r, 'idEquipamento', 'id_equipamento', 'idEquipamentoFk', 'id_equipamento_fk'),
    tipoManutencao: normManutencao(r['tipoManutencao'] ?? r['tipo_manutencao']),
    prioridadeOrdemServico: normPrioridade(r['prioridadeOrdemServico'] ?? r['prioridade_ordem_servico']),
    statusOrdemServico: normStatus(statusRaw),
    descricaoFalha: pickStr(r, 'descricaoFalha', 'descricao_falha', 'descricao', 'observacao'),
    aberturaEm: aberturaEm || dataCriacao || '',
    dataCriacao: dataCriacao || aberturaEm || '',
    dataAtualizacao: dataAtualizacao || dataCriacao || aberturaEm || '',
  };
  const eq = pickOptionalStr(r, 'equipamentoNome', 'equipamento_nome');
  if (eq) o.equipamentoNome = eq;
  const idT = pickOptionalStr(r, 'idTecnico', 'id_tecnico');
  if (idT) o.idTecnico = idT;
  let tnome = pickOptionalStr(r, 'tecnicoNome', 'tecnico_nome', 'nomeTecnico', 'nome_tecnico');
  if (!tnome) {
    const techRec =
      asRecord(r['tecnico']) ?? asRecord(r['tecnicoUsuario']) ?? asRecord(r['usuarioTecnico']);
    if (techRec) {
      tnome = pickOptionalStr(techRec, 'nomeUsuario', 'nome_usuario', 'nome', 'nomeCompleto', 'nome_completo');
    }
  }
  if (tnome) o.tecnicoNome = tnome;
  const idSol = pickOptionalStr(r, 'idSolicitante', 'id_solicitante');
  if (idSol) o.idSolicitante = idSol;
  const sSol = pickOptionalStr(r, 'solicitanteNome', 'solicitante_nome');
  if (sSol) o.solicitanteNome = sSol;
  const dServ = pickOptionalStr(r, 'descricaoServico', 'descricao_servico');
  if (dServ) o.descricaoServico = dServ;
  const pecas = pickOptionalStr(r, 'pecasUtilizadas', 'pecas_utilizadas');
  if (pecas) o.pecasUtilizadas = pecas;
  const h = pickNum(r, 'horasTrabalhadas', 'horas_trabalhadas');
  if (h !== undefined) o.horasTrabalhadas = h;
  const conc = pickOptionalDate(
    r,
    'conclusaoEm',
    'conclusao_em',
    'dataConclusao',
    'data_conclusao',
    'dt_conclusao',
    'dataFechamento',
    'data_fechamento',
  );
  if (conc) o.conclusaoEm = conc;
  const iniEm = pickOptionalDate(r, 'inicioEm', 'inicio_em');
  if (iniEm) o.inicioEm = iniEm;
  return o;
}

/**
 * GET /app/ordens: array direto ou envelope (`{ dados: [...] }`, etc.).
 */
export function extrairItensOrdensBrutos(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const o = asRecord(body);
  if (!o) return [];
  for (const key of ['dados', 'data', 'ordens', 'items', 'lista'] as const) {
    const v = o[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export function normalizarListaOrdens(body: unknown): OrdemServico[] {
  return extrairItensOrdensBrutos(body).map(mapBrutoParaOrdemServico);
}
