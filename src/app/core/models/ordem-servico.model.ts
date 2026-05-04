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
  descricaoServico?: string;
  pecasUtilizadas?: string;
  horasTrabalhadas?: number;
  aberturaEm: Date | string;
  /** Início da execução pelo técnico (quando existir na API). */
  inicioEm?: Date | string;
  conclusaoEm?: Date | string;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
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
  horasTrabalhadas?: number;
  conclusaoEm?: string;
}

export interface AtualizarOrdemServicoPayload {
  tipoManutencao?: ManutencaoType;
  prioridadeOrdemServico?: PrioridadeType;
  statusOrdemServico?: OrdemStatus;
  descricaoFalha?: string;
  idTecnico?: string;
  descricaoServico?: string;
  pecasUtilizadas?: string;
  horasTrabalhadas?: number;
  /** Início do atendimento (API costuma persistir em `data_inicio`). */
  inicioEm?: string;
  conclusaoEm?: string;
}
