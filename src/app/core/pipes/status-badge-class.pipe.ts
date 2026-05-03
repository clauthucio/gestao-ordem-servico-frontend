// Transforma um status em classes CSS para o badge (fundo + texto).

import { Pipe, PipeTransform } from '@angular/core';
import { OrdemStatus } from '../enums/status.enum';
import { statusOrdemBadgeColorClasses } from '../utils/status-badge.util';

@Pipe({
  name: 'statusBadgeClass',
  standalone: true,
})
export class StatusBadgeClassPipe implements PipeTransform {
  /**
   * @param status - Valor do enum OrdemStatus
   * @returns Classes Tailwind (fundo claro + texto) para o badge
   */
  transform(status: OrdemStatus | string): string {
    return statusOrdemBadgeColorClasses(status as OrdemStatus);
  }
}
