export enum OrdemStatus {
  ABERTO = 'ABERTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  AGUARDANDO_PECA = 'AGUARDANDO_PECA',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}
 //Define as cores para badges (CSS) de status
export const STATUS_COLORS: Record<OrdemStatus, string> = {
  [OrdemStatus.ABERTO]: 'bg-gray-500',
  [OrdemStatus.EM_ANDAMENTO]: 'bg-blue-500',
  [OrdemStatus.AGUARDANDO_PECA]: 'bg-yellow-500',
  [OrdemStatus.CONCLUIDO]: 'bg-green-500',
  [OrdemStatus.CANCELADO]: 'bg-red-500',
};

//Mapping: status → descrição em português
export const STATUS_LABELS: Record<OrdemStatus, string> = {
  [OrdemStatus.ABERTO]: 'Aberto',
  [OrdemStatus.EM_ANDAMENTO]: 'Em Andamento',
  [OrdemStatus.AGUARDANDO_PECA]: 'Aguardando Peça',
  [OrdemStatus.CONCLUIDO]: 'Concluído',
  [OrdemStatus.CANCELADO]: 'Cancelado',
};
