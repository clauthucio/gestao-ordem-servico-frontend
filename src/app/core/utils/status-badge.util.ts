import { OrdemStatus } from '../enums/status.enum';

/**
 * Paleta única para badges de status de OS (fundo claro + texto).
 * Alinhada ao dashboard: neutro → azul (ativo) → laranja (espera) → verde (sucesso) → vermelho (cancelado).
 */
export const STATUS_BADGE_COLOR_CLASSES: Record<OrdemStatus, string> = {
  [OrdemStatus.ABERTO]: 'bg-slate-100 text-slate-600',
  [OrdemStatus.EM_ANDAMENTO]: 'bg-blue-50 text-blue-600',
  [OrdemStatus.AGUARDANDO_PECA]: 'bg-orange-50 text-orange-600',
  [OrdemStatus.CONCLUIDO]: 'bg-emerald-50 text-emerald-600',
  [OrdemStatus.CANCELADO]: 'bg-red-50 text-red-600',
};

export function statusOrdemBadgeColorClasses(status: OrdemStatus): string {
  return STATUS_BADGE_COLOR_CLASSES[status] ?? 'bg-slate-100 text-slate-600';
}

/** Chaves do modelo de exibição da lista de OS (`StatusOS` em os-list). */
export type StatusOsView = 'aberto' | 'execucao' | 'pendente' | 'finalizada' | 'cancelada';

const STATUS_OS_VIEW_TO_ORDEM: Record<StatusOsView, OrdemStatus> = {
  aberto: OrdemStatus.ABERTO,
  execucao: OrdemStatus.EM_ANDAMENTO,
  pendente: OrdemStatus.AGUARDANDO_PECA,
  finalizada: OrdemStatus.CONCLUIDO,
  cancelada: OrdemStatus.CANCELADO,
};

export function statusOsViewBadgeColorClasses(view: StatusOsView): string {
  return statusOrdemBadgeColorClasses(STATUS_OS_VIEW_TO_ORDEM[view]);
}
