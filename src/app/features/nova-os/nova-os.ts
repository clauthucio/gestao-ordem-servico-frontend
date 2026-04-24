import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type TipoManutencao = 'corretiva' | 'preventiva' | 'preditiva';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica';

export interface AtivoOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-nova-os',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './nova-os.html'
})
export class NovaOs {
  // Header
  osNumber = 'OS-2026-0482';

  // Form data
  ativoSelecionado = '';
  descricao = '';
  tiposManutencao: TipoManutencao[] = ['corretiva', 'preventiva', 'preditiva'];
  tipoManutencao: TipoManutencao = 'corretiva';
  prioridade: Prioridade = 'media';

  // Options
  ativos: AtivoOption[] = [
    { value: 'inj-04', label: 'Injetora 04 - Setor Plásticos' },
    { value: 'est-b2', label: 'Esteira B2 - Logística Norte' },
    { value: 'cnc-01', label: 'Torno CNC 01 - Metalurgia' },
    { value: 'ref-09', label: 'Resfriador R-09 - Utilidades' }
  ];

  // Side panel
  ultimaManutencao = '12 Out 2025';
  horasOperacao = '4.820h';
  statusAtivo = 'Em Operação';

  onTipoChange(tipo: TipoManutencao): void {
    this.tipoManutencao = tipo;
  }

  onPrioridadeChange(prioridade: Prioridade): void {
    this.prioridade = prioridade;
  }

  onCancelar(): void {
    console.log('Cancelar');
  }

  onSalvar(): void {
    console.log('Salvar OS:', {
      ativo: this.ativoSelecionado,
      tipo: this.tipoManutencao,
      prioridade: this.prioridade,
      descricao: this.descricao
    });
  }

  getTipoIcon(tipo: TipoManutencao): string {
    const map: Record<TipoManutencao, string> = {
      corretiva: 'report',
      preventiva: 'event_available',
      preditiva: 'query_stats'
    };
    return map[tipo];
  }

  getTipoColor(tipo: TipoManutencao): string {
    const map: Record<TipoManutencao, string> = {
      corretiva: 'text-error',
      preventiva: 'text-secondary',
      preditiva: 'text-tertiary'
    };
    return map[tipo];
  }

  isCritica(): boolean {
    return this.prioridade === 'critica';
  }
}