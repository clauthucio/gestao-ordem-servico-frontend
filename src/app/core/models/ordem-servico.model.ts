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
  conclusaoEm?: Date | string;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
}

//Resposta do backend quando lista ordens
export interface ListaOrdensResponse {
  data: OrdemServico[];
  total: number;
  page: number;
  limit: number;
}
