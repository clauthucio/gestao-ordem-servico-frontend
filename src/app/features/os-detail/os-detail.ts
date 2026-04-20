import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


export interface TimelineEvent {
  icon: string;
  filled?: boolean;
  title: string;
  timestamp: string;
  author: string;
  note?: string;
  iconBg: string;
  iconColor: string;
}

@Component({
  selector: 'app-os-detail',
  standalone: true,
  imports: [FormsModule], // 2. Adicione aqui
  templateUrl: './os-detail.html'
})
export class OsDetail {
  // Header
  osNumber = 'OS-2024-0881';
  osType = 'Manutenção Corretiva';
  priority = 'Prioridade Crítica';
  createdAt = '14 de Outubro, 2024 às 09:45';
  currentStatus = 'Em Andamento';
  statusColor = 'bg-secondary';

  // Equipment
  equipmentName = 'Prensa Hidráulica 400T';
  equipmentId = 'EQ-PH-088';
  equipmentSector = 'Setor A - Estamparia';

  // Requester
  requesterName = 'Pedro Oliveira';
  requesterRole = 'Operador de Produção III';
  requesterAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-L0lstpdbYhXNPRCFuQ-PXtwS5j56V10jzZmtqoWi98YFjhWaFWz4z3pi_Mws_5Tlpi3DCRh67Ptp7npbauFv8DaQo3POreZNldakWZR1LNZL9zhnwAM5kgn_6We4oQR2nF4ye5_2-AknXEy9Z-65rQVm4-tkQXB81Wmrc4mTruopOSNC_ihfHFZmNL7iK0pbcsAHPPyvKia3mDOCwYrYHqHx_ST_LhTwXyTMRvKompofQLQLrYE2vjztkZcLjTRqcY0F0bv8yn6H';

  // Description
  failureDescription = 'Vazamento intermitente observado no cilindro principal durante o ciclo de compressão. Queda de pressão nominal em 15% após 2 horas de operação contínua. O sensor de temperatura do óleo indicou 72°C (Acima do normal).';

  // Timeline
  timelineEvents: TimelineEvent[] = [
    {
      icon: 'add_alert',
      title: 'OS Criada via terminal móvel',
      timestamp: '14/10/2024 às 09:45',
      author: 'Pedro Oliveira',
      iconBg: 'bg-surface-container-highest',
      iconColor: 'text-primary'
    },
    {
      icon: 'person_check',
      title: 'Técnico Ricardo Alves atribuído',
      timestamp: '14/10/2024 às 10:02',
      author: 'Sistema',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    {
      icon: 'play_circle',
      filled: true,
      title: 'Início da Manutenção',
      timestamp: '14/10/2024 às 10:30',
      author: 'Ricardo Alves',
      note: 'Iniciando desmontagem da proteção do cilindro para inspeção das vedações.',
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary'
    }
  ];

  // Assignment
  technicians = [
    'Ricardo Alves (Nível II)',
    'Marcos Silva (Sênior)',
    'Ana Costa (Nível I)'
  ];
  selectedTechnician = 'Ricardo Alves (Nível II)';

  // Manual
  manualName = 'Manual_PH400T_v2.pdf';
  manualInfo = '8.4 MB • Versão 2023';

  onReassign(): void {
    console.log('Reatribuir técnico:', this.selectedTechnician);
  }

  onCloseOS(): void {
    console.log('Encerrar OS');
  }

  onDownloadManual(): void {
    console.log('Download manual:', this.manualName);
  }

  onNewComment(): void {
    console.log('Novo comentário');
  }

  onChangeStatus(): void {
    console.log('Alterar status');
  }

  getIconSettings(filled: boolean | undefined | null): string {
  // Se 'filled' for true, retorna FILL 1. Se for false ou vazio, retorna FILL 0.
  return !!filled ? "'FILL' 1" : "'FILL' 0";
}
}