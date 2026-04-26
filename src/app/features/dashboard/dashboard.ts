import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export type StatusOS = 'aberta' | 'em_andamento' | 'critica' | 'aguardando_peca' | 'concluida';
export type StatusTecnico = 'disponivel' | 'ocupado' | 'critico';

export interface OrdemServico {
  id: string;
  equipamento: string;
  setor: string;
  status: StatusOS;
  tecnico?: string;
}

export interface DiaAtividade {
  dia: string;
  valor: number;
  ativo?: boolean;
}

export interface Tecnico {
  nome: string;
  status: StatusTecnico;
  tarefa?: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html'
})
export class Dashboard {
  // Métricas
  osAbertasHoje = 12;
  variacaoOntem = '8% vs. ontem';
  osEmAndamento = 24;
  progressoAndamento = 75;
  osCriticas = 3;
  alertaCritico = 'Ação imediata necessária em Linha A';
  tempoMedioConclusao = '4.2h';
  metaTempo = 'Dentro da meta (5h)';

  // Tabela OS
  ordens: OrdemServico[] = [
    { id: '#OS-8842', equipamento: 'Prensa Hidráulica P-04', setor: 'Estamparia', status: 'aberta' },
    { id: '#OS-8841', equipamento: 'Motor de Exaustão EX-22', setor: 'Pintura', status: 'em_andamento', tecnico: 'Ricardo Alves' },
    { id: '#OS-8839', equipamento: 'Robô de Solda RS-09', setor: 'Montagem', status: 'critica', tecnico: 'Fabio Souza' },
    { id: '#OS-8838', equipamento: 'Esteira Transportadora T-01', setor: 'Logística', status: 'aguardando_peca', tecnico: 'Marcos Lima' },
    { id: '#OS-8835', equipamento: 'Compressor Central C-02', setor: 'Utilidades', status: 'concluida', tecnico: 'Ana Paula' }
  ];

  // Gráfico atividade
  atividadeSemanal: DiaAtividade[] = [
    { dia: 'Seg', valor: 40 },
    { dia: 'Ter', valor: 65 },
    { dia: 'Qua', valor: 85 },
    { dia: 'Qui', valor: 55 },
    { dia: 'Sex', valor: 70 },
    { dia: 'Sab', valor: 95 },
    { dia: 'Dom', valor: 60, ativo: true }
  ];

  resumoAtividade = {
    concluidas: 142,
    rejeitadas: 2,
    eficiencia: '94%'
  };

  // Equipe
  tecnicos: Tecnico[] = [
    { nome: 'Ricardo Alves', status: 'ocupado', tarefa: 'OS-8841', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDg6n0KBPJcqXxX2h-1lmOQZkZlxoFKuBnQ_AfGoWqTK1n-85cyKa_whduwN_kw9uR6IOIcqI31fF7eH5YpPS0DKnuqbCcW9-E_PXTr3eX9M53WwRFTIE1BQucx3s0aGRhsg73xpaBpanUx7wxYF-RPemHtMIlGLesIxBPkdtDzxqSoyfChge3Q-Wi1oRpWFhSQrWqrOfX0q-c8s1y1EexxeRUJNrD3uLenDIIJGrCXGxB9G_mre5v4ON778acfQR3wC_CkRDFwT9sq' },
    { nome: 'Ana Paula', status: 'disponivel', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAF1dGwwNehj3gUVyIhCy0mil-8Q1xZKqv9pd7isSxOI0nxsyH5pAEBLNUJ8vOsZ0fJylL-jt5qvX7jmA_1bhxcP6XO6PEVXO6gvTct5pYhS_3-p_i5w3lLZ-VX4jRLGiKgC-N_xJlHO_eJAAMQiRbDEZ2xJUU2y0k81asKu_UO7LLHHMbpACRwzQZINTlbM9nYWyBU4KSxBplbsuAfXUHviKMzXsO0-_2bGTSVONGzzpgTBIAGVx2voryHSoLHkQ49VNv-7thCZyto' },
    { nome: 'Fabio Souza', status: 'critico', tarefa: 'OS-8839', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAKSWo8Z919yjy8H_SvzPRhv5qV7Huq_a0MYxQNlfbspeXgjiyJt3H601w5Pe6--uf3z-F-nXYst3pqMHX1GIyhtuBLUrBiMJsS6naPhbu3OIMAp3q4Uq6XsEelLBpzbTbxXUtDVxWt5MtkyoPILWR0iso6zu1CKgCpWB21uGi08a380VtQaLAeZNJ24pa-Vg-BBschJh7lJl225uELL2YqPtZrtBOZUjBHEx1iwTkuqzkH47HbdyC5ttNvf2T_8cCI13mBQ4F60O4' }
  ];

  getStatusClass(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberta: 'bg-on-surface-variant/10 text-on-surface-variant',
      em_andamento: 'bg-secondary/10 text-secondary',
      critica: 'bg-error/10 text-error',
      aguardando_peca: 'bg-orange-100 text-orange-600',
      concluida: 'bg-tertiary/10 text-tertiary'
    };
    return `inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase ${map[status]}`;
  }

  getStatusLabel(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberta: 'Aberta',
      em_andamento: 'Em andamento',
      critica: 'Prioridade Crítica',
      aguardando_peca: 'Aguardando Peça',
      concluida: 'Concluída'
    };
    return map[status];
  }

  getTecnicoStatusClass(status: StatusTecnico): string {
    const map: Record<StatusTecnico, string> = {
      disponivel: 'text-tertiary',
      ocupado: 'text-secondary',
      critico: 'text-error'
    };
    return `text-[10px] font-medium ${map[status]}`;
  }

  getTecnicoDotClass(status: StatusTecnico): string {
    const map: Record<StatusTecnico, string> = {
      disponivel: 'bg-tertiary',
      ocupado: 'bg-secondary',
      critico: 'bg-error'
    };
    return `w-2 h-2 rounded-full ${map[status]}`;
  }

  getTecnicoLabel(tec: Tecnico): string {
    if (tec.status === 'disponivel') return 'Disponível';
    if (tec.status === 'ocupado') return `Em Manutenção ${tec.tarefa ?? ''}`;
    return `Ocupado (Crítico)`;
  }

  onVerTodas(): void {
    console.log('Ver todas as OS');
  }

  onAcaoOS(id: string): void {
    console.log('Ação OS:', id);
  }

  gerarRelatorio(): void {
    console.log('Gerar relatório PDF');
  }

  criarOS(): void {
    console.log('Criar nova OS');
  }
}
