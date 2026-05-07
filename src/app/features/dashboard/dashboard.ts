import { RouterLink } from '@angular/router';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';
import { UserRole } from '../../core/enums/roles.enum';
import { OrdemStatus, STATUS_LABELS } from '../../core/enums/status.enum';
import { statusOrdemBadgeColorClasses } from '../../core/utils/status-badge.util';

export interface DiaAtividade {
  dia: string;
  valor: number;
  ativo?: boolean;
  porcentagem: number;
}

export interface DisponibilidadeTecnico {
  idTecnico: string;
  tecnicoNome: string;
  baixa: number;
  media: number;
  alta: number;
  critica: number;
}


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  private ordemService = inject(OrdemServicoService);
  private usuarioService = inject(UsuarioService);
  private cdr = inject(ChangeDetectorRef);

  tecnicoNomeMap = new Map<string, string>();

  // Métricas — calculadas a partir dos dados reais
  osAbertasHoje = 0;
  osEmAndamento = 0;
  osCriticas = 0;
  osConcluidas = 0;
  canceladas = 0;
  eficiencia = '--';
  tempoMedioConclusao = '--';
  osAguardandopeca = 0;

  // Filtro ativo pelos cards
  filtroAtivo: string | null = null;
  readonly filtroLabels: Record<string, string> = {
    'ABERTO': 'Abertas',
    'EM_ANDAMENTO': 'Em Andamento',
    'CRITICA': 'Alta Prioridade',
    'CONCLUIDO': 'Concluídas',
    'CANCELADO': 'Canceladas',
    'AGUARDANDO_PECA': 'Aguardando Peça'
    
  };

  // Estado da tabela
  ordens: OrdemServico[] = [];  // preenchido pelo backend
  carregando = true;            // exibe spinner enquanto aguarda
  erro: string | null = null;   // exibe mensagem se der erro

  // Chamado automaticamente ao abrir a tela
  ngOnInit(): void {
    console.log('[Dashboard] ngOnInit() executado - iniciando carregamento de ordens');
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar()
    }).subscribe({
      next: ({ ordens: dados, usuarios }) => {
        // Popula mapa idUsuario → nomeUsuario filtrando apenas técnicos
        this.tecnicoNomeMap.clear();
        usuarios
          .filter(u => u.perfilUsuario === UserRole.TECNICO)
          .forEach(u => this.tecnicoNomeMap.set(u.idUsuario, u.nomeUsuario));
        console.log('[Dashboard] Técnicos carregados:', this.tecnicoNomeMap.size);

        console.log('[Dashboard] Dados recebidos do backend:', dados);
        console.log('[Dashboard] Total de ordens recebidas:', dados.length);

        // Filtra apenas OS dos últimos 30 dias por aberturaEm
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        console.log('[Dashboard] Data de corte (30 dias atrás):', trintaDiasAtras);

        this.ordens = dados.filter(os => new Date(os.aberturaEm) >= trintaDiasAtras);
        console.log('[Dashboard] Ordens após filtro de 30 dias:', this.ordens.length);
        console.log('[Dashboard] Ordens filtradas:', this.ordens);

        // Calcula métricas a partir dos dados filtrados
        this.osAbertasHoje = this.ordens.filter(o => o.statusOrdemServico === OrdemStatus.ABERTO).length;
        this.osEmAndamento = this.ordens.filter(o => o.statusOrdemServico === OrdemStatus.EM_ANDAMENTO).length;
        this.osCriticas = this.ordens.filter(o =>
          o.statusOrdemServico === OrdemStatus.ABERTO &&
          o.prioridadeOrdemServico === 'CRITICA'
        ).length;
        this.osConcluidas = this.ordens.filter(o => o.statusOrdemServico === OrdemStatus.CONCLUIDO).length;
        this.canceladas = this.ordens.filter(o => o.statusOrdemServico === OrdemStatus.CANCELADO).length;
        this.osAguardandopeca = this.ordens.filter(o => o.statusOrdemServico === OrdemStatus.AGUARDANDO_PECA).length;
        const total = this.ordens.length;
        this.eficiencia = total > 0 ? Math.round((this.osConcluidas / total) * 100) + '%' : '--';

        // Calcula tempo médio de conclusão em horas
        const concluidas = this.ordens.filter(o =>
          o.statusOrdemServico === OrdemStatus.CONCLUIDO && o.conclusaoEm
        );
        if (concluidas.length > 0) {
          const totalHoras = concluidas.reduce((acc, os) => {
            const abertura = new Date(os.aberturaEm).getTime();
            const conclusao = new Date(os.conclusaoEm!).getTime();
            const horas = (conclusao - abertura) / (1000 * 60 * 60);
            return acc + horas;
          }, 0);
          const mediaHoras = Math.round(totalHoras / concluidas.length);
          this.tempoMedioConclusao = mediaHoras + 'h';
        }
        this.calcularAtividadeSemanal(dados);
        console.log('[Dashboard] Métricas calculadas:', {
          osAbertasHoje: this.osAbertasHoje,
          osEmAndamento: this.osEmAndamento,
          osCriticas: this.osCriticas,
          osConcluidas: this.osConcluidas,
          canceladas: this.canceladas,
          eficiencia: this.eficiencia,
          tempoMedioConclusao: this.tempoMedioConclusao,
          osAguardandopeca: this.osAguardandopeca

        });

        this.carregando = false;
        this.cdr.markForCheck();
        console.log('[Dashboard] Dados carregados com sucesso. carregando=false');
      },
      error: (err) => {
        console.error('[Dashboard] Erro ao carregar ordens:', err);
        this.erro = 'Não foi possível carregar as ordens de serviço.';
        this.carregando = false;
      }
    });
  }

  // Gráfico atividade semanal — calculado a partir dos dados reais
  atividadeSemanal: DiaAtividade[] = [];

  private calcularAtividadeSemanal(dados: OrdemServico[]): void {
    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    const ultimos7: DiaAtividade[] = [];

    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);
      const dateStr = data.toDateString();
      const count = dados.filter(os => new Date(os.aberturaEm).toDateString() === dateStr).length;
      ultimos7.push({ dia: diasNomes[data.getDay()], valor: count, ativo: i === 0, porcentagem: 0 });
    }

    const maxValor = Math.max(...ultimos7.map(d => d.valor), 1);
    this.atividadeSemanal = ultimos7.map(d => ({
      ...d,
      porcentagem: Math.max(Math.round((d.valor / maxValor) * 100), 8)
    }));
  }

  // Retorna classes CSS do badge conforme o status da OS
  getStatusClass(status: OrdemStatus): string {
    return `inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase ${statusOrdemBadgeColorClasses(status)}`;
  }

  // Retorna o label em português do status usando o enum
  getStatusLabel(status: OrdemStatus): string {
    return STATUS_LABELS[status];
  }

  onVerTodas(): void {
    this.selecionarFiltro(null);
  }

  selecionarFiltro(filtro: string | null): void {
    this.filtroAtivo = this.filtroAtivo === filtro ? null : filtro;
  }

  get ordensFiltradas(): OrdemServico[] {
    if (!this.filtroAtivo) return this.ordens;
    if (this.filtroAtivo === 'CRITICA') {
      return this.ordens.filter(o =>
        o.statusOrdemServico === OrdemStatus.ABERTO &&
        o.prioridadeOrdemServico === 'CRITICA'
      );
    }
    return this.ordens.filter(o => o.statusOrdemServico === this.filtroAtivo as OrdemStatus);
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

  getTecnicoNome(idTecnico?: string): string {
    if (!idTecnico) return '---';
    return this.tecnicoNomeMap.get(idTecnico) ?? '---';
  }

  get disponibilidadeTecnicos(): DisponibilidadeTecnico[] {
    const ativas = this.ordens.filter(o =>
      o.statusOrdemServico === OrdemStatus.ABERTO ||
      o.statusOrdemServico === OrdemStatus.EM_ANDAMENTO
    );

    const mapa = new Map<string, DisponibilidadeTecnico>();

    for (const os of ativas) {
      if (!os.idTecnico) continue;
      const nome = this.tecnicoNomeMap.get(os.idTecnico) ?? `Técnico ${os.idTecnico.substring(0, 8)}`;

      if (!mapa.has(os.idTecnico)) {
        mapa.set(os.idTecnico, {
          idTecnico: os.idTecnico,
          tecnicoNome: nome,
          baixa: 0,
          media: 0,
          alta: 0,
          critica: 0,
        });
      }

      const entrada = mapa.get(os.idTecnico)!;
      switch (os.prioridadeOrdemServico) {
        case 'BAIXA':   entrada.baixa++;   break;
        case 'MEDIA':   entrada.media++;   break;
        case 'ALTA':    entrada.alta++;    break;
        case 'CRITICA': entrada.critica++; break;
      }
    }

    return Array.from(mapa.values())
      .sort((a, b) => a.tecnicoNome.localeCompare(b.tecnicoNome));
  }
}
