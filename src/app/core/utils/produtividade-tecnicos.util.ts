import { OrdemStatus } from '../enums/status.enum';
import type { ManutencaoType, OrdemServico, PrioridadeType } from '../models/ordem-servico.model';

/** Chave sintética para OS concluídas sem `idTecnico`. */
export const CHAVE_SEM_TECNICO = '__sem_tecnico__';

export interface TecnicoProdutividadeAgg {
  chaveTecnico: string;
  nomeExibicao: string;
  osConcluidas: number;
  horasTotais: number;
  /** `null` quando não há OS (divisão evitada). */
  mediaHorasPorOs: number | null;
  ordens: OrdemServico[];
}

export interface ResumoProdutividadeGlobal {
  totalOs: number;
  totalHoras: number;
  mediaHorasPorOsGlobal: number | null;
  tecnicosComOs: number;
}

export interface GraficoBarraItem {
  nome: string;
  valor: number;
  percentual: number;
  /** Cor sólida para barra (evita purge de classes Tailwind dinâmicas). */
  corHex: string;
}

const CORES_GRAFICO_HEX = ['#6750A4', '#4F378A', '#7D5260', '#625B71', '#386A20'] as const;

/**
 * Limites do período em **horário local**: início 00:00:00 e fim 23:59:59.999 do calendário.
 * `dataInicio` / `dataFim` no formato `yyyy-MM-dd` (valor típico de `<input type="date">`).
 */
export function criarLimitesPeriodoLocal(dataInicio: string, dataFim: string): { inicioMs: number; fimMs: number } {
  const [yi, mi, di] = dataInicio.split('-').map(Number);
  const [yf, mf, df] = dataFim.split('-').map(Number);
  const inicio = new Date(yi, mi - 1, di, 0, 0, 0, 0);
  const fim = new Date(yf, mf - 1, df, 23, 59, 59, 999);
  return { inicioMs: inicio.getTime(), fimMs: fim.getTime() };
}

/**
 * Converte data/hora para ms. Strings **só-data** `yyyy-MM-dd` usam **calendário local** ao meio-dia,
 * alinhado a `criarLimitesPeriodoLocal` (evita deslocamento de `new Date('yyyy-MM-dd')` em UTC).
 */
export function parseDataReferenciaMs(val: Date | string | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return Number.isNaN(t) ? null : t;
  }
  const s = String(val).trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const t = new Date(y, mo - 1, d, 12, 0, 0, 0).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const d = new Date(s);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

export function parseConclusaoMs(conclusaoEm: Date | string | undefined): number | null {
  if (conclusaoEm === undefined || conclusaoEm === null) return null;
  return parseDataReferenciaMs(conclusaoEm);
}

/** Ms para abertura/criação: `aberturaEm` ou, se ausente, `dataCriacao`. */
export function parseAberturaOuCriacaoMs(o: OrdemServico): number | null {
  return parseDataReferenciaMs(o.aberturaEm) ?? parseDataReferenciaMs(o.dataCriacao);
}

/**
 * Compara com CONCLUIDO de forma tolerante a strings vindas do backend (espaços, caixa).
 */
const STATUS_CONCLUIDO_EQUIV = new Set([
  'CONCLUIDO',
  'FINALIZADA',
  'FINALIZADO',
  'CONCLUIDA',
]);

function normTokenStatus(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

const VALORES_ORDEM_STATUS = new Set(Object.values(OrdemStatus) as string[]);

/**
 * Normaliza o valor de `statusOrdemServico` (enum ou string da API) para `OrdemStatus`.
 * Alinhado às regras de `ordem-servico-api-normalize` para sinónimos de concluído.
 */
export function mapearStatusOrdemParaEnum(raw: unknown): OrdemStatus {
  if (raw === OrdemStatus.ABERTO) return OrdemStatus.ABERTO;
  if (raw === OrdemStatus.EM_ANDAMENTO) return OrdemStatus.EM_ANDAMENTO;
  if (raw === OrdemStatus.AGUARDANDO_PECA) return OrdemStatus.AGUARDANDO_PECA;
  if (raw === OrdemStatus.CONCLUIDO) return OrdemStatus.CONCLUIDO;
  if (raw === OrdemStatus.CANCELADO) return OrdemStatus.CANCELADO;
  const s = normTokenStatus(raw);
  if (VALORES_ORDEM_STATUS.has(s)) return s as OrdemStatus;
  if (STATUS_CONCLUIDO_EQUIV.has(s)) return OrdemStatus.CONCLUIDO;
  if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED' || s === 'ENCERRADA' || s === 'ENCERRADO') {
    return OrdemStatus.CONCLUIDO;
  }
  return OrdemStatus.ABERTO;
}

export function statusOrdemEhConcluida(raw: unknown): boolean {
  if (raw === OrdemStatus.CONCLUIDO) return true;
  return STATUS_CONCLUIDO_EQUIV.has(normTokenStatus(raw));
}

/**
 * Instante para filtro de período: `conclusaoEm` → `dataAtualizacao` → `inicioEm` → abertura ou `dataCriacao`
 * (útil quando a API omite conclusão ou `dataAtualizacao` não reflete a conclusão).
 */
export function instanteReferenciaConclusao(o: OrdemServico): number | null {
  const direto = parseConclusaoMs(o.conclusaoEm);
  if (direto !== null) return direto;
  if (!statusOrdemEhConcluida(o.statusOrdemServico)) return null;
  const atual = parseDataReferenciaMs(o.dataAtualizacao);
  if (atual !== null) return atual;
  const ini = parseDataReferenciaMs(o.inicioEm);
  if (ini !== null) return ini;
  return parseAberturaOuCriacaoMs(o);
}

/**
 * Instante usado para **inclusão no relatório por período**: apenas `conclusaoEm` em OS concluídas.
 * Sem fallback — a data inicial/final da página aplica-se à data de conclusão registada.
 */
export function instanteConclusaoParaPeriodoRelatorio(o: OrdemServico): number | null {
  if (!statusOrdemEhConcluida(o.statusOrdemServico)) return null;
  return parseConclusaoMs(o.conclusaoEm);
}

/**
 * Instante usado para **inclusão no período** e ordenação no relatório:
 * — OS **Concluído**: só `conclusaoEm` (sem fallback).
 * — OS **Cancelado**: `conclusaoEm` (se existir) → `dataAtualizacao` → `inicioEm` → abertura ou `dataCriacao`.
 * — Demais status: `dataAtualizacao` → `inicioEm` → abertura ou `dataCriacao`.
 */
export function instanteParaFiltroPeriodoRelatorio(o: OrdemServico): number | null {
  const st = mapearStatusOrdemParaEnum(o.statusOrdemServico);
  if (st === OrdemStatus.CONCLUIDO) {
    return parseConclusaoMs(o.conclusaoEm);
  }
  if (st === OrdemStatus.CANCELADO) {
    return (
      parseDataReferenciaMs(o.conclusaoEm) ??
      parseDataReferenciaMs(o.dataAtualizacao) ??
      parseDataReferenciaMs(o.inicioEm) ??
      parseAberturaOuCriacaoMs(o)
    );
  }
  return (
    parseDataReferenciaMs(o.dataAtualizacao) ??
    parseDataReferenciaMs(o.inicioEm) ??
    parseAberturaOuCriacaoMs(o)
  );
}

/**
 * Horas para o relatório:
 * — OS **concluídas**: `horasTrabalhadas` menos `horasAguardandoPecaAcumuladas` (contrato API: total aguardando pré-calculado); se `horasTrabalhadas` ausente, estima `(conclusão − início) h` menos aguardando.
 * — OS **canceladas**: `horasTotaisAteCancelamento` da API se existir; senão `(fim − início) h` com fim = conclusão ou data de atualização (inclui aguardando peça).
 * — Demais status: `horasTrabalhadas` quando válido; se ausente, estima pelo intervalo início → referência de conclusão.
 */
export function horasContabilizadasRelatorio(o: OrdemServico): number {
  const st = mapearStatusOrdemParaEnum(o.statusOrdemServico);
  const h = o.horasTrabalhadas;

  if (st === OrdemStatus.CONCLUIDO) {
    if (typeof h === 'number' && !Number.isNaN(h)) {
      const ag =
        typeof o.horasAguardandoPecaAcumuladas === 'number' && !Number.isNaN(o.horasAguardandoPecaAcumuladas)
          ? o.horasAguardandoPecaAcumuladas
          : 0;
      return Math.max(0, h - ag);
    }
    const fim = parseConclusaoMs(o.conclusaoEm);
    const ini = parseDataReferenciaMs(o.inicioEm) ?? parseAberturaOuCriacaoMs(o);
    if (fim === null || ini === null) return 0;
    const elapsed = (fim - ini) / (3600 * 1000);
    if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
    const ag =
      typeof o.horasAguardandoPecaAcumuladas === 'number' && !Number.isNaN(o.horasAguardandoPecaAcumuladas)
        ? o.horasAguardandoPecaAcumuladas
        : 0;
    return Math.max(0, elapsed - ag);
  }

  if (st === OrdemStatus.CANCELADO) {
    const ht = o.horasTotaisAteCancelamento;
    if (typeof ht === 'number' && !Number.isNaN(ht)) {
      return Math.max(0, ht);
    }
    const ini = parseDataReferenciaMs(o.inicioEm) ?? parseAberturaOuCriacaoMs(o);
    const fim = parseDataReferenciaMs(o.conclusaoEm) ?? parseDataReferenciaMs(o.dataAtualizacao);
    if (fim === null || ini === null) return 0;
    const elapsed = (fim - ini) / (3600 * 1000);
    return elapsed > 0 && Number.isFinite(elapsed) ? elapsed : 0;
  }

  if (typeof h === 'number' && !Number.isNaN(h)) {
    return h;
  }
  const fim = instanteReferenciaConclusao(o);
  const ini = parseDataReferenciaMs(o.inicioEm) ?? parseAberturaOuCriacaoMs(o);
  if (fim === null || ini === null) return 0;
  const derivado = (fim - ini) / (3600 * 1000);
  return derivado > 0 && Number.isFinite(derivado) ? derivado : 0;
}

/** OS cujo status está em `statusPermitidos` e cujo instante de período cai em `[inicioMs, fimMs]`. */
export function filtrarOrdensRelatorioNoPeriodo(
  ordens: OrdemServico[],
  inicioMs: number,
  fimMs: number,
  statusPermitidos: OrdemStatus[],
): OrdemServico[] {
  if (statusPermitidos.length === 0) return [];
  const permitidos = new Set(statusPermitidos);
  return ordens.filter((o) => {
    const st = mapearStatusOrdemParaEnum(o.statusOrdemServico);
    if (!permitidos.has(st)) return false;
    const t = instanteParaFiltroPeriodoRelatorio(o);
    if (t === null) return false;
    return t >= inicioMs && t <= fimMs;
  });
}

/** OS concluídas cuja **data de conclusão** (`conclusaoEm`) está dentro do intervalo (inclusive). */
export function filtrarOsConcluidasNoPeriodo(
  ordens: OrdemServico[],
  inicioMs: number,
  fimMs: number,
): OrdemServico[] {
  return filtrarOrdensRelatorioNoPeriodo(ordens, inicioMs, fimMs, [OrdemStatus.CONCLUIDO]);
}

export function aplicarFiltrosTipoPrioridade(
  lista: OrdemServico[],
  tipo: ManutencaoType | '',
  prioridade: PrioridadeType | '',
): OrdemServico[] {
  const norm = (v: string | undefined) =>
    String(v ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  return lista.filter((o) => {
    if (tipo && norm(o.tipoManutencao as string) !== norm(tipo)) return false;
    if (prioridade && norm(o.prioridadeOrdemServico as string) !== norm(prioridade)) return false;
    return true;
  });
}

export function agruparPorTecnico(ordens: OrdemServico[]): TecnicoProdutividadeAgg[] {
  const map = new Map<string, { nome: string; ordens: OrdemServico[] }>();

  for (const o of ordens) {
    const semId = !o.idTecnico || String(o.idTecnico).trim() === '';
    const chave = semId ? CHAVE_SEM_TECNICO : o.idTecnico!;
    const nome =
      chave === CHAVE_SEM_TECNICO
        ? 'Sem técnico atribuído'
        : (o.tecnicoNome?.trim() || 'Técnico sem nome');

    if (!map.has(chave)) {
      map.set(chave, { nome, ordens: [] });
    } else if (nome && map.get(chave)!.nome === 'Técnico sem nome' && o.tecnicoNome?.trim()) {
      map.get(chave)!.nome = o.tecnicoNome.trim();
    }
    map.get(chave)!.ordens.push(o);
  }

  const aggs: TecnicoProdutividadeAgg[] = [];
  for (const [chaveTecnico, { nome, ordens: lista }] of map) {
    const horasTotais = lista.reduce((s, x) => s + horasContabilizadasRelatorio(x), 0);
    const osConcluidas = lista.length;
    const mediaHorasPorOs = osConcluidas > 0 ? horasTotais / osConcluidas : null;
    const ordensOrdenadas = [...lista].sort(
      (a, b) =>
        (instanteParaFiltroPeriodoRelatorio(a) ?? 0) - (instanteParaFiltroPeriodoRelatorio(b) ?? 0),
    );
    aggs.push({
      chaveTecnico,
      nomeExibicao: nome,
      osConcluidas,
      horasTotais,
      mediaHorasPorOs,
      ordens: ordensOrdenadas,
    });
  }

  aggs.sort((a, b) => b.osConcluidas - a.osConcluidas);
  return aggs;
}

export function calcularResumoGlobal(aggs: TecnicoProdutividadeAgg[]): ResumoProdutividadeGlobal {
  const totalOs = aggs.reduce((s, a) => s + a.osConcluidas, 0);
  const totalHoras = aggs.reduce((s, a) => s + a.horasTotais, 0);
  const mediaHorasPorOsGlobal = totalOs > 0 ? totalHoras / totalOs : null;
  const tecnicosComOs = aggs.filter((a) => a.osConcluidas > 0).length;
  return { totalOs, totalHoras, mediaHorasPorOsGlobal, tecnicosComOs };
}

export function montarDadosGraficoTopOs(aggs: TecnicoProdutividadeAgg[], topN: number): GraficoBarraItem[] {
  const sorted = [...aggs].sort((a, b) => b.osConcluidas - a.osConcluidas).slice(0, topN);
  const max = sorted[0]?.osConcluidas ?? 0;
  const denom = max > 0 ? max : 1;
  return sorted.map((a, i) => ({
    nome: a.nomeExibicao,
    valor: a.osConcluidas,
    percentual: Math.round((a.osConcluidas / denom) * 100),
    corHex: CORES_GRAFICO_HEX[i % CORES_GRAFICO_HEX.length],
  }));
}

export interface EquipamentoAbertasAgg {
  idEquipamento: string;
  nomeExibicao: string;
  quantidade: number;
  /** Média aritmética de `horasContabilizadasRelatorio` entre as ordens abertas do grupo. */
  mediaHorasPorOrdemServico: number | null;
  ordens: OrdemServico[];
}

export function agruparAbertasPorEquipamento(
  todasOrdens: OrdemServico[],
  dataInicio: string,
  dataFim: string,
): EquipamentoAbertasAgg[] {
  const { inicioMs, fimMs } = criarLimitesPeriodoLocal(dataInicio, dataFim);
  const base = filtrarOrdensRelatorioNoPeriodo(todasOrdens, inicioMs, fimMs, [OrdemStatus.ABERTO]);
  const map = new Map<string, { nome: string; ordens: OrdemServico[] }>();
  for (const o of base) {
    const id = String(o.idEquipamento ?? '').trim() || '__sem_equipamento__';
    const nome = o.equipamentoNome?.trim() || `Equipamento ${id}`;
    if (!map.has(id)) {
      map.set(id, { nome, ordens: [] });
    } else if (map.get(id)!.nome.startsWith('Equipamento ') && o.equipamentoNome?.trim()) {
      map.get(id)!.nome = o.equipamentoNome.trim();
    }
    map.get(id)!.ordens.push(o);
  }
  const aggs: EquipamentoAbertasAgg[] = [];
  for (const [idEquipamento, { nome, ordens: lista }] of map) {
    const ordensOrdenadas = [...lista].sort(
      (a, b) =>
        (instanteParaFiltroPeriodoRelatorio(a) ?? 0) - (instanteParaFiltroPeriodoRelatorio(b) ?? 0),
    );
    const somaH = ordensOrdenadas.reduce((s, o) => s + horasContabilizadasRelatorio(o), 0);
    const n = ordensOrdenadas.length;
    const mediaHorasPorOrdemServico = n > 0 ? somaH / n : null;
    aggs.push({
      idEquipamento,
      nomeExibicao: nome,
      quantidade: lista.length,
      mediaHorasPorOrdemServico,
      ordens: ordensOrdenadas,
    });
  }
  aggs.sort((a, b) => b.quantidade - a.quantidade);
  return aggs;
}

export function montarDadosGraficoTopEquipamento(aggs: EquipamentoAbertasAgg[], topN: number): GraficoBarraItem[] {
  const sorted = [...aggs].sort((a, b) => b.quantidade - a.quantidade).slice(0, topN);
  const max = sorted[0]?.quantidade ?? 0;
  const denom = max > 0 ? max : 1;
  return sorted.map((a, i) => ({
    nome: a.nomeExibicao,
    valor: a.quantidade,
    percentual: Math.round((a.quantidade / denom) * 100),
    corHex: CORES_GRAFICO_HEX[i % CORES_GRAFICO_HEX.length],
  }));
}

/**
 * OS concluídas ou canceladas cuja data de referência do relatório está no intervalo (sem duplicar por id).
 */
export function filtrarConcluidasOuCanceladasNoPeriodo(
  ordens: OrdemServico[],
  dataInicio: string,
  dataFim: string,
): OrdemServico[] {
  const { inicioMs, fimMs } = criarLimitesPeriodoLocal(dataInicio, dataFim);
  const a = filtrarOrdensRelatorioNoPeriodo(ordens, inicioMs, fimMs, [OrdemStatus.CONCLUIDO]);
  const b = filtrarOrdensRelatorioNoPeriodo(ordens, inicioMs, fimMs, [OrdemStatus.CANCELADO]);
  const seen = new Set<string>();
  const out: OrdemServico[] = [];
  for (const o of [...a, ...b]) {
    if (seen.has(o.idOrdemServico)) continue;
    seen.add(o.idOrdemServico);
    out.push(o);
  }
  return out;
}

export interface MediaEsperaPecasResultado {
  /** Média apenas entre OS com `horasAguardandoPecaAcumuladas > 0`. */
  mediaHoras: number | null;
  osComEsperaRegistada: number;
  osNoUniverso: number;
  somaHorasEspera: number;
}

export function calcularMediaTempoEsperaPecas(ordens: OrdemServico[]): MediaEsperaPecasResultado {
  const comDado = ordens.filter((o) => {
    const v = o.horasAguardandoPecaAcumuladas;
    return typeof v === 'number' && !Number.isNaN(v) && v > 0;
  });
  const soma = comDado.reduce((s, o) => s + (o.horasAguardandoPecaAcumuladas ?? 0), 0);
  const n = comDado.length;
  return {
    mediaHoras: n > 0 ? soma / n : null,
    osComEsperaRegistada: n,
    osNoUniverso: ordens.length,
    somaHorasEspera: soma,
  };
}

/**
 * Pipeline: OS com status em `statusPermitidos` e instante de período no intervalo → agrupamento por técnico.
 * @param statusPermitidos omisso = apenas **Concluído** (comportamento legado).
 */
export function computarProdutividadePorTecnico(
  todasOrdens: OrdemServico[],
  dataInicio: string,
  dataFim: string,
  statusPermitidos: OrdemStatus[] = [OrdemStatus.CONCLUIDO],
): TecnicoProdutividadeAgg[] {
  const { inicioMs, fimMs } = criarLimitesPeriodoLocal(dataInicio, dataFim);
  const base = filtrarOrdensRelatorioNoPeriodo(todasOrdens, inicioMs, fimMs, statusPermitidos);
  return agruparPorTecnico(base);
}
