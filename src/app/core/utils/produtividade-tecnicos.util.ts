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

/**
 * Compara com CONCLUIDO de forma tolerante a strings vindas do backend (espaços, caixa).
 */
const STATUS_CONCLUIDO_EQUIV = new Set([
  'CONCLUIDO',
  'FINALIZADA',
  'FINALIZADO',
  'CONCLUIDA',
]);

export function statusOrdemEhConcluida(raw: unknown): boolean {
  if (raw === OrdemStatus.CONCLUIDO) return true;
  const s = String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return STATUS_CONCLUIDO_EQUIV.has(s);
}

/**
 * Instante para filtro de período: `conclusaoEm` → `dataAtualizacao` → `inicioEm` → `aberturaEm`
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
  return parseDataReferenciaMs(o.aberturaEm);
}

/** OS com status concluído e instante de referência dentro do intervalo (inclusive). */
export function filtrarOsConcluidasNoPeriodo(
  ordens: OrdemServico[],
  inicioMs: number,
  fimMs: number,
): OrdemServico[] {
  return ordens.filter((o) => {
    if (!statusOrdemEhConcluida(o.statusOrdemServico)) return false;
    const t = instanteReferenciaConclusao(o);
    if (t === null) return false;
    return t >= inicioMs && t <= fimMs;
  });
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
    const horasTotais = lista.reduce((s, x) => s + (x.horasTrabalhadas ?? 0), 0);
    const osConcluidas = lista.length;
    const mediaHorasPorOs = osConcluidas > 0 ? horasTotais / osConcluidas : null;
    const ordensOrdenadas = [...lista].sort(
      (a, b) =>
        (instanteReferenciaConclusao(a) ?? 0) - (instanteReferenciaConclusao(b) ?? 0),
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

/** Pipeline: período (conclusão) → opcional tipo/prioridade → agrupamento. */
export function computarProdutividadePorTecnico(
  todasOrdens: OrdemServico[],
  dataInicio: string,
  dataFim: string,
  tipo: ManutencaoType | '',
  prioridade: PrioridadeType | '',
): TecnicoProdutividadeAgg[] {
  const { inicioMs, fimMs } = criarLimitesPeriodoLocal(dataInicio, dataFim);
  let base = filtrarOsConcluidasNoPeriodo(todasOrdens, inicioMs, fimMs);
  base = aplicarFiltrosTipoPrioridade(base, tipo, prioridade);
  return agruparPorTecnico(base);
}
