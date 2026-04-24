import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type StatusOS = 'em_andamento' | 'aguardando_peca' | 'concluida';

export interface StatusOption {
  value: StatusOS;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-atualiza-os',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './atualiza-os.html'
})
export class AtualizaOs {
  // Header
  osNumber = 'OS #8842-EX';
  osTitle = 'Reparo Motor EX-22';
  localizacao = 'Ala Sul - Setor de Compressão';
  solicitante = 'Engenharia de Processos';
  prioridade = 'Alta';

  // Form
  statusSelecionado: StatusOS = 'em_andamento';
  relatoTecnico = '';

  // Footer
  ultimaAtualizacao = '2h atrás por J. Silva';

  statusOptions: StatusOption[] = [
    { value: 'em_andamento', label: 'Em andamento', icon: 'sync', color: 'text-secondary' },
    { value: 'aguardando_peca', label: 'Aguardando Peça', icon: 'inventory_2', color: 'text-error' },
    { value: 'concluida', label: 'Concluída', icon: 'check_circle', color: 'text-tertiary' }
  ];

  onStatusChange(status: StatusOS): void {
    this.statusSelecionado = status;
  }

  onSalvar(): void {
    console.log('Salvar atualização:', {
      status: this.statusSelecionado,
      relato: this.relatoTecnico
    });
  }

  onVoltar(): void {
    console.log('Voltar');
  }

  onAnexarFoto(): void {
    console.log('Anexar foto');
  }

  onReportarIncidente(): void {
    console.log('Reportar incidente');
  }
}