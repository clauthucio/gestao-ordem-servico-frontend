import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export type PrioridadeOS = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusOS = 'aberto' | 'execucao' | 'pendente' | 'finalizada';

export interface OrdemServico {
  numero: string;
  equipamento: string;
  tipo: string;
  prioridade: PrioridadeOS;
  status: StatusOS;
  tecnico: string;
  tecnicoAvatar: string;
  dataAbertura: string;
}

@Component({
  selector: 'app-os-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './os-list.html'
})
export class OsList {
  // Header
  titulo = 'Inventário de Ordens de Serviço';
  subtitulo = 'Gerencie e monitore todas as solicitações de manutenção do polo.';

  // Filtros
  busca = '';
  filtroStatus = 'todos';
  filtroPrioridade = 'todas';

  // Paginação
  paginaAtual = 1;
  totalPaginas = 16;
  totalItens = 156;
  itensPorPagina = 10;

  // Dados
  ordens: OrdemServico[] = [
    {
      numero: 'OS-2024-0891',
      equipamento: 'Injetora 04 - Setor A',
      tipo: 'Corretiva',
      prioridade: 'critica',
      status: 'aberto',
      tecnico: 'João Silva',
      tecnicoAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApkBzPHsR9sv3IdN0uuxc6M8YqXpmwOI3eEKwHQLCWHSrXhzpHV25ZLQ1pYPHBDbJGcOG007EhxKQLxScIOV73IbTdzwjZdbz6iIrEqVpEVzi9eeBhFqLdzX3omn36A5O7BC2vmEnpX7vlwwXJiHfF54FuDL09cfHPwWbTmE027isf0Vad7-jGqeUWKisM0GkvNv1oOWBKsHZiotyXF2xBRpaOQwIEFTOTLaQOBlLmhrGu9ZC1ouljjmCXUcapqq9Oa-_R5pouyEsa',
      dataAbertura: '14 Out, 08:30'
    },
    {
      numero: 'OS-2024-0888',
      equipamento: 'Braço Robótico Kuka #02',
      tipo: 'Preventiva',
      prioridade: 'media',
      status: 'finalizada',
      tecnico: 'Maria Oliveira',
      tecnicoAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCW7P9QM_O7Eq_N9EU6_46ZTgrk6QghLE6Zl6m2QUfRzWYROx4XtSEUe4XHbI5EMs5kh8r1DnJGFWaOfBvWb3yfBPm-40bIDxAqhu4EIvBeSEbI5hF2FFtCWH28ibvxKSZR3TasQv1uSCwzHoZVK0gKYYtIiUrCV53FRkiF31cVlIixxBAczygSEGNJyqRwu4RKP0AfWJ2x1IWfR-DZu9tzchrfOhUlGuFd9WTZ5d_6hfUnKo1LGNvjJHCuh17nPpoADjHpEElPlQep',
      dataAbertura: '13 Out, 14:15'
    },
    {
      numero: 'OS-2024-0875',
      equipamento: 'Prensa Hidráulica P-10',
      tipo: 'Corretiva',
      prioridade: 'alta',
      status: 'execucao',
      tecnico: 'Carlos Mendes',
      tecnicoAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHy45UQhXuhRO6N7irWXzFwRZT6jn0eAsINyWO7AkR2Cfe1Nh7S_mSkrFfwVtHUWztn8cpo-0wFz7xJm35upYw6gNibMpjfwk5HEBKlAOJc-NfFab96E-2_eUArtvl0vO03N9GuG_hSdBekpFQ8c9mVPOkEeV5jXmpyipE7t2s4XuNZZ54WZPo8E93q9M04InnBKaKAc3oe3WwaCHmJ1Ibd4A9TEHzJSUNnEP_1nYQxiabcN0LDgU8CiMQZ9CDOG_4kaG0i8pQTsna',
      dataAbertura: '12 Out, 10:00'
    },
    {
      numero: 'OS-2024-0862',
      equipamento: 'Torre de Resfriamento T4',
      tipo: 'Preventiva',
      prioridade: 'baixa',
      status: 'pendente',
      tecnico: '',
      tecnicoAvatar: '',
      dataAbertura: '10 Out, 16:45'
    }
  ];

  getPrioridadeClass(prioridade: PrioridadeOS): string {
    const map: Record<PrioridadeOS, string> = {
      baixa: 'bg-outline/10 text-outline',
      media: 'bg-secondary/10 text-secondary',
      alta: 'bg-on-surface-variant/20 text-on-surface-variant',
      critica: 'bg-error/10 text-error'
    };
    return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${map[prioridade]}`;
  }

  getPrioridadeLabel(prioridade: PrioridadeOS): string {
    const map: Record<PrioridadeOS, string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      critica: 'Crítica'
    };
    return map[prioridade];
  }

  getStatusClass(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberto: 'bg-on-surface-variant/10 text-on-surface-variant',
      execucao: 'bg-secondary-container text-on-secondary-container',
      pendente: 'bg-error-container text-on-error-container',
      finalizada: 'bg-tertiary/10 text-tertiary'
    };
    return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${map[status]}`;
  }

  getStatusLabel(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberto: 'Em Aberto',
      execucao: 'Em Execução',
      pendente: 'Pendente',
      finalizada: 'Finalizada'
    };
    return map[status];
  }

  onNovaOS(): void {
    console.log('Nova OS');
  }

  onVerDetalhes(numero: string): void {
    console.log('Ver detalhes:', numero);
  }

  onEditar(numero: string): void {
    console.log('Editar:', numero);
  }

  onPaginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  onProximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  onIrParaPagina(pagina: number): void {
    this.paginaAtual = pagina;
  }
}