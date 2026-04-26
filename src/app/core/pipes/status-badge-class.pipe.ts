 //Transforma um status em classe CSS para exibir a cor correta

import { Pipe, PipeTransform } from '@angular/core';
import { OrdemStatus, STATUS_COLORS } from '../enums/status.enum';

@Pipe({
  name: 'statusBadgeClass',
  standalone: true,
})
export class StatusBadgeClassPipe implements PipeTransform {
  /**
   * @param status - Valor do enum OrdemStatus
   * @returns Classe CSS com a cor correspondente
   */
  transform(status: OrdemStatus | string): string {
    // Se o status existe no mapa de cores, retorna a classe
    // Se não, retorna cinza como padrão
    return STATUS_COLORS[status as OrdemStatus] || 'bg-gray-500';
  }
}
