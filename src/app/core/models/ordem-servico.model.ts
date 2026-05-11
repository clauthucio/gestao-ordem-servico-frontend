import { OrdemStatus } from '../enums/status.enum';

export type ManutencaoType = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA';
export type PrioridadeType = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface OrdemServico {
  idOrdemServico: string;
  numeroOrdemServico: string;
  idEquipamento: string;
  equipamentoNome?: string;
  idTecnico?: string;
  tecnicoNome?: string;
  idSolicitante?: string;
  solicitanteNome?: string;
  tipoManutencao: ManutencaoType;
  prioridadeOrdemServico: PrioridadeType;
  statusOrdemServico: OrdemStatus;
  descricaoFalha: string;
  /** Descrição geral da ordem de serviço (API: `descricao_ordem_servico`). */
  descricaoOrdemServico?: string;
  descricaoServico?: string;
  pecasUtilizadas?: string;
  horasTrabalhadas?: number;
  /**
   * Horas acumuladas em espera de peças (somatório dos períodos do log / legado na entidade OS).
   * Aliases na API: `totalHorasAguardando`, `horas_aguardando_peca_acumuladas`, etc. — ver normalize.
   */
  horasAguardandoPecaAcumuladas?: number;
  /** Início do período atual em aguardando peça (timestamptz), se a API expuser. */
  aguardandoPecaDesde?: Date | string;
  /**
   * Horas totais decorridas desde `inicioEm` até o cancelamento (inclui tempo em aguardando peça), quando a API informar.
   */
  horasTotaisAteCancelamento?: number;
  /**
   * Data de abertura explícita na API (`aberturaEm` / `data_abertura`).
   * Opcional: contratos novos podem enviar só `dataCriacao` — usar `dataAberturaOuCriacao(os)` na UI.
   */
  aberturaEm?: Date | string;
  /** Início da execução pelo técnico (quando existir na API). */
  inicioEm?: Date | string;
  conclusaoEm?: Date | string;
  /** Meta follow-up / SLA; não entra no cálculo de horas trabalhadas. */
  dataPrevistaConclusao?: Date | string;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
}

/** Data de abertura para exibição/filtros quando a API omite `aberturaEm` e envia só `dataCriacao`. */
export function dataAberturaOuCriacao(os: OrdemServico): Date | string | undefined {
  const a = os.aberturaEm;
  if (a !== undefined && a !== null && String(a).trim() !== '') return a;
  const d = os.dataCriacao;
  if (d !== undefined && d !== null && String(d).trim() !== '') return d;
  return undefined;
}

// Backend retorna array direto, sem envelope
export type ListaOrdensResponse = OrdemServico[];

export interface CriarOrdemServicoPayload {
  idEquipamento: string;
  idSolicitante: string;
  tipoManutencao: ManutencaoType;
  prioridadeOrdemServico: PrioridadeType;
  statusOrdemServico: OrdemStatus;
  descricaoFalha: string;
  idTecnico: string;
  descricaoServico?: string;
  pecasUtilizadas?: string;
}

/** Item do endpoint `GET .../aguardando-peca-log` (períodos em aguardando peça). */
export interface AguardandoPecaLogItem {
  idLog?: string;
  /** FK da OS (Fase 6 API); útil para auditoria e relatórios. */
  idOrdemServico?: string;
  aguardandoPecaInicio: Date | string;
  aguardandoPecaFim?: Date | string;
  horasAguardandoPeca?: number;
  /** Metadado de criação do registo de log, quando a API enviar. */
  dataCriacao?: Date | string;
}

export interface AguardandoPecaLogResponse {
  /** Presente quando a API inclui o id da OS no envelope da resposta (Fase 6). */
  idOrdemServico?: string;
  totalHorasAguardando: number;
  logs: AguardandoPecaLogItem[];
}

export interface AtualizarOrdemServicoPayload {
  tipoManutencao?: ManutencaoType;
  prioridadeOrdemServico?: PrioridadeType;
  statusOrdemServico?: OrdemStatus;
  descricaoFalha?: string;
  idTecnico?: string | null;
  descricaoServico?: string;
  pecasUtilizadas?: string;
  /** ISO 8601; follow-up — não alterar `conclusaoEm`/`inicioEm` pelo cliente. */
  dataPrevistaConclusao?: string;
}
