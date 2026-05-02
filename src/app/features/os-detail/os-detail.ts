import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';
import { Usuario } from '../../core/models/usuario.model';
import { Equipamento } from '../../core/models/equipamento.model';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './os-detail.html',
})
export class OsDetail implements OnInit, OnDestroy {
  private readonly ordemService = inject(OrdemServicoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly equipamentoService = inject(EquipamentoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  os: OrdemServico | null = null;
  equipamento: Equipamento | null = null;
  tecnicos: Usuario[] = [];
  /** idUsuario → nomeUsuario (perfil TECNICO); mesmo critério que os-list para resolver nome quando a API omite tecnicoNome */
  private readonly tecnicoNomePorId = new Map<string, string>();
  /** idUsuario → nomeUsuario (todos os perfis); resolve quem criou a OS quando a API omite solicitanteNome */
  private readonly usuarioNomePorId = new Map<string, string>();
  timelineEvents: TimelineEvent[] = [];
  carregando = true;
  erro: string | null = null;
  selectedTecnico: string | null = null;
  atualizandoTecnico = false;

  fechamentoForm = {
    descricaoServico: '',
    pecasUtilizadas: '',
    horasTrabalhadas: null as number | null,
  };
  fechamentoErro: string | null = null;
  encerrando = false;

  readonly statusLabels: Record<string, string> = {
    ABERTO: 'Aberto',
    EM_ANDAMENTO: 'Em Andamento',
    AGUARDANDO_PECA: 'Aguardando Peça',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
  };

  readonly tipoManutencaoLabels: Record<string, string> = {
    CORRETIVA: 'Manutenção Corretiva',
    PREVENTIVA: 'Manutenção Preventiva',
    PREDITIVA: 'Manutenção Preditiva',
  };

  readonly prioridadeLabels: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
  };

  readonly statusColorMap: Record<string, string> = {
    ABERTO: 'bg-blue-500',
    EM_ANDAMENTO: 'bg-secondary',
    AGUARDANDO_PECA: 'bg-amber-500',
    CONCLUIDO: 'bg-green-600',
    CANCELADO: 'bg-error',
  };

  get isEditTechnicianAllowed(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.perfilUsuario === UserRole.ADMIN || user.perfilUsuario === UserRole.SOLICITANTE;
  }

  get isClosureAllowed(): boolean {
    return this.os?.statusOrdemServico === OrdemStatus.EM_ANDAMENTO;
  }

  get nomeTecnicoExibicao(): string {
    if (!this.os) return 'Não atribuído';
    return this.nomeTecnicoResolvido(this.os);
  }

  get nomeSolicitanteExibicao(): string {
    if (!this.os) return 'N/D';
    return this.nomeSolicitanteResolvido(this.os);
  }

  ngOnInit(): void {
    const osId = this.route.snapshot.paramMap.get('id');
    if (!osId) {
      this.erro = 'ID da ordem de serviço não encontrado.';
      this.carregando = false;
      return;
    }

    forkJoin({
      os: this.ordemService.buscarPorId(osId),
      usuarios: this.usuarioService.listar(),
      equipamentos: this.equipamentoService.listar(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ os, usuarios, equipamentos }) => {
          this.tecnicoNomePorId.clear();
          usuarios
            .filter((u) => u.perfilUsuario === UserRole.TECNICO)
            .forEach((u) => this.tecnicoNomePorId.set(u.idUsuario, u.nomeUsuario));

          this.usuarioNomePorId.clear();
          usuarios.forEach((u) => this.usuarioNomePorId.set(u.idUsuario, u.nomeUsuario));

          this.os = os;
          this.selectedTecnico = os.idTecnico || null;
          this.tecnicos = usuarios.filter(
            (u) => u.perfilUsuario === UserRole.TECNICO && u.statusUsuario
          );
          this.equipamento = equipamentos.find((e) => e.id === os.idEquipamento) || null;
          this.timelineEvents = this.generateTimeline(os);
          this.carregando = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Não foi possível carregar os detalhes da ordem de serviço.';
          this.carregando = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private nomeTecnicoResolvido(os: OrdemServico): string {
    if (!os.idTecnico) return 'Não atribuído';
    return os.tecnicoNome ?? this.tecnicoNomePorId.get(os.idTecnico) ?? 'Técnico';
  }

  private nomeSolicitanteResolvido(os: OrdemServico): string {
    return (
      os.solicitanteNome ??
      (os.idSolicitante ? this.usuarioNomePorId.get(os.idSolicitante) : undefined) ??
      'N/D'
    );
  }

  private generateTimeline(os: OrdemServico): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    events.push({
      icon: 'add_alert',
      filled: false,
      title: 'Ordem de Serviço Criada',
      timestamp: this.formatarData(os.dataCriacao),
      author: this.nomeSolicitanteResolvido(os),
      iconBg: 'bg-surface-container-highest',
      iconColor: 'text-primary',
    });

    if (os.idTecnico) {
      events.push({
        icon: 'person_check',
        filled: false,
        title: `Técnico ${this.nomeTecnicoResolvido(os)} atribuído`,
        timestamp: this.formatarData(os.dataCriacao),
        author: 'Sistema',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      });
    }

    if (os.statusOrdemServico !== OrdemStatus.ABERTO) {
      events.push({
        icon: 'play_circle',
        filled: true,
        title: 'Início da Manutenção',
        timestamp: this.formatarData(os.aberturaEm),
        author: this.nomeTecnicoResolvido(os),
        iconBg: 'bg-secondary/10',
        iconColor: 'text-secondary',
      });
    }

    if (
      os.statusOrdemServico === OrdemStatus.AGUARDANDO_PECA ||
      os.statusOrdemServico === OrdemStatus.CONCLUIDO
    ) {
      events.push({
        icon: 'schedule',
        filled: true,
        title: 'Aguardando Peça',
        timestamp: this.formatarData(os.dataAtualizacao),
        author: this.nomeTecnicoResolvido(os),
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
      });
    }

    if (os.statusOrdemServico === OrdemStatus.CONCLUIDO) {
      events.push({
        icon: 'check_circle',
        filled: true,
        title: 'Ordem Concluída',
        timestamp: this.formatarData(os.conclusaoEm ?? os.dataAtualizacao),
        author: this.nomeTecnicoResolvido(os),
        note: os.descricaoServico
          ? os.descricaoServico.substring(0, 120) + (os.descricaoServico.length > 120 ? '...' : '')
          : undefined,
        iconBg: 'bg-green-600/10',
        iconColor: 'text-green-600',
      });
    }

    return events;
  }

  formatarData(data: Date | string | undefined): string {
    if (!data) return 'N/D';
    const d = new Date(data);
    return (
      d.toLocaleDateString('pt-BR') +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  }

  onAtualizarTecnico(): void {
    if (!this.os) return;
    this.atualizandoTecnico = true;
    this.ordemService
      .atualizar(this.os.idOrdemServico, { idTecnico: this.selectedTecnico ?? undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (osAtualizada) => {
          this.os = osAtualizada;
          this.timelineEvents = this.generateTimeline(osAtualizada);
          this.atualizandoTecnico = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.erro = err?.error?.message || 'Erro ao atualizar técnico responsável.';
          this.atualizandoTecnico = false;
          this.cdr.markForCheck();
        },
      });
  }

  onEncerrar(): void {
    const { descricaoServico, pecasUtilizadas, horasTrabalhadas } = this.fechamentoForm;
    const vazios: string[] = [];
    if (!descricaoServico?.trim()) vazios.push('Descrição do Serviço');
    if (!pecasUtilizadas?.trim()) vazios.push('Peças Utilizadas');
    if (!horasTrabalhadas) vazios.push('Horas Trabalhadas');
    if (vazios.length > 0) {
      this.fechamentoErro = `${vazios.join(', ')} ${vazios.length === 1 ? 'é obrigatório' : 'são obrigatórios'}.`;
      return;
    }

    this.fechamentoErro = null;
    this.encerrando = true;
    this.ordemService
      .atualizar(this.os!.idOrdemServico, {
        statusOrdemServico: OrdemStatus.CONCLUIDO,
        descricaoServico,
        pecasUtilizadas,
        horasTrabalhadas: Number(horasTrabalhadas),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (osAtualizada) => {
          this.os = osAtualizada;
          this.timelineEvents = this.generateTimeline(osAtualizada);
          this.fechamentoForm = { descricaoServico: '', pecasUtilizadas: '', horasTrabalhadas: null };
          this.encerrando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.fechamentoErro = err?.error?.message || 'Erro ao encerrar a ordem de serviço.';
          this.encerrando = false;
          this.cdr.markForCheck();
        },
      });
  }

  onVoltar(): void {
    this.router.navigate(['/app/ordens']);
  }

  getIconSettings(filled: boolean | undefined | null): string {
    return !!filled ? "'FILL' 1" : "'FILL' 0";
  }
}
