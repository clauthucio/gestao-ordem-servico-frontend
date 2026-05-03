export enum OrdemStatus {
  ABERTO = 'ABERTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  AGUARDANDO_PECA = 'AGUARDANDO_PECA',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}

//Mapping: status → descrição em português
export const STATUS_LABELS: Record<OrdemStatus, string> = {
  [OrdemStatus.ABERTO]: 'Aberto',
  [OrdemStatus.EM_ANDAMENTO]: 'Em Andamento',
  [OrdemStatus.AGUARDANDO_PECA]: 'Aguardando Peça',
  [OrdemStatus.CONCLUIDO]: 'Concluído',
  [OrdemStatus.CANCELADO]: 'Cancelado',
};
