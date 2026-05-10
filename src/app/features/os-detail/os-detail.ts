import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import {
  AguardandoPecaLogResponse,
  dataAberturaOuCriacao,
  ManutencaoType,
  OrdemServico,
  PrioridadeType,
} from '../../core/models/ordem-servico.model';
import { Usuario } from '../../core/models/usuario.model';
import { Equipamento } from '../../core/models/equipamento.model';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';
import { appendOsTimelineEvent, getOsTimelineEvents } from '../../core/storage/os-timeline-local.storage';
import { usuarioPodeAcaoComoAdminOuTecnicoAtribuido } from '../../core/utils/os-acoes-permissao.util';
import { mensagemUsuarioErroApiOrdemServico } from '../../core/utils/ordem-servico-api-message.util';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { OsFormComponent } from '../../components/os-form/os-form';

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
  imports: [CommonModule, FormsModule, DialogComponent, ModalContainerComponent, OsFormComponent],
  templateUrl: './os-detail.html',
  host: {
    class: 'flex flex-col flex-1 min-h-0 overflow-hidden',
  },
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
  /** Histórico de períodos em aguardando peça (API); fallback no painel para campos da OS. */
  aguardandoPecaLog: AguardandoPecaLogResponse | null = null;
  equipamento: Equipamento | null = null;
  tecnicos: Usuario[] = [];
  /** idUsuario → nomeUsuario (perfil TECNICO); mesmo critério que os-list para resolver nome quando a API omite tecnicoNome */
  private readonly tecnicoNomePorId = new Map<string, string>();
  /** idUsuario → nomeUsuario (todos os perfis); resolve quem criou a OS quando a API omite solicitanteNome */
  private readonly usuarioNomePorId = new Map<string, string>();
  timelineEvents: TimelineEvent[] = [];
  carregando = true;
  erro: string | null = null;
  /** id do técnico selecionado no select; `''` quando a OS não tem técnico e ainda não foi escolhido um. */
  selectedTecnico = '';
  atualizandoTecnico = false;

  fechamentoForm = {
    descricaoServico: '',
    pecasUtilizadas: '',
  };
  fechamentoErro: string | null = null;
  encerrando = false;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
  dialogCallback: (() => void) | null = null;

  showModalIniciar = false;
  showModalEdicao = false;
  osParaIniciar: OrdemServico | null = null;
  osEmEdicao: OrdemServico | null = null;

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

  /** Cor apenas no valor exibido (rótulo permanece padrão do tema). */
  classeCorValorTipoManutencao(tipo: ManutencaoType): string {
    const map: Record<ManutencaoType, string> = {
      CORRETIVA: 'text-orange-700 dark:text-orange-300',
      PREVENTIVA: 'text-green-700 dark:text-green-300',
      PREDITIVA: 'text-violet-700 dark:text-violet-300',
    };
    return map[tipo] ?? 'text-on-background';
  }

  /** Cor apenas no valor exibido (rótulo permanece padrão do tema). */
  classeCorValorPrioridade(p: PrioridadeType): string {
    const map: Record<PrioridadeType, string> = {
      BAIXA: 'text-on-surface-variant',
      MEDIA: 'text-blue-700 dark:text-blue-300',
      ALTA: 'text-amber-700 dark:text-amber-300',
      CRITICA: 'text-red-600 dark:text-red-400',
    };
    return map[p] ?? 'text-on-background';
  }

  get isEditTechnicianAllowed(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.perfilUsuario === UserRole.ADMIN || user.perfilUsuario === UserRole.SOLICITANTE;
  }

  get isClosureAllowed(): boolean {
    return this.os?.statusOrdemServico === OrdemStatus.EM_ANDAMENTO;
  }

  /** Valores oficiais de horas (líquido / aguardando) só após conclusão ou cancelamento. */
  get exibirValoresHorasOficiais(): boolean {
    if (!this.os) return false;
    const s = this.os.statusOrdemServico;
    return s === OrdemStatus.CONCLUIDO || s === OrdemStatus.CANCELADO;
  }

  /** Permite gravar só com técnico válido e quando houve alteração em relação à OS carregada. */
  get podeAtualizarTecnico(): boolean {
    if (!this.os) return false;
    const sel = this.selectedTecnico?.trim() ?? '';
    if (!sel) return false;
    const atual = this.os.idTecnico?.trim() ?? '';
    return sel !== atual;
  }

  /** Mesma regra que a lista: admin ou técnico atribuído (Aguardar peça / Retomar). */
  get podeAcaoComoAdminOuTecnicoAtribuido(): boolean {
    return usuarioPodeAcaoComoAdminOuTecnicoAtribuido(this.authService.getCurrentUser(), this.os?.idTecnico);
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
      agLog: this.ordemService.buscarAguardandoPecaLog(osId).pipe(
        catchError(() => of<AguardandoPecaLogResponse>({ totalHorasAguardando: 0, logs: [] })),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ os, usuarios, equipamentos, agLog }) => {
          this.tecnicoNomePorId.clear();
          usuarios
            .filter((u) => u.perfilUsuario === UserRole.TECNICO)
            .forEach((u) => this.tecnicoNomePorId.set(u.idUsuario, u.nomeUsuario));

          this.usuarioNomePorId.clear();
          usuarios.forEach((u) => this.usuarioNomePorId.set(u.idUsuario, u.nomeUsuario));

          this.os = os;
          this.aguardandoPecaLog = agLog;
          this.selectedTecnico = os.idTecnico?.trim() ? os.idTecnico.trim() : '';
          this.tecnicos = usuarios.filter(
            (u) => u.perfilUsuario === UserRole.TECNICO && u.statusUsuario
          );
          this.equipamento = equipamentos.find((e) => e.id === os.idEquipamento) || null;
          this.timelineEvents = this.generateTimeline(os, agLog);
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

  private parseTs(data: Date | string | undefined): number {
    if (!data) return 0;
    const t = new Date(data).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  private generateTimeline(os: OrdemServico, agLog: AguardandoPecaLogResponse | null): TimelineEvent[] {
    type Entry = { ts: number; ev: TimelineEvent };
    const entries: Entry[] = [];

    const push = (ts: number, ev: TimelineEvent): void => {
      entries.push({ ts, ev });
    };

    const refAbertura = this.dataAberturaParaExibicao(os);

    push(this.parseTs(refAbertura), {
      icon: 'add_alert',
      filled: false,
      title: 'Ordem de Serviço Criada',
      timestamp: this.formatarData(refAbertura),
      author: this.nomeSolicitanteResolvido(os),
      iconBg: 'bg-surface-container-highest',
      iconColor: 'text-primary',
    });

    if (os.idTecnico) {
      push(this.parseTs(refAbertura), {
        icon: 'person_check',
        filled: false,
        title: `Técnico ${this.nomeTecnicoResolvido(os)} atribuído`,
        timestamp: this.formatarData(refAbertura),
        author: 'Sistema',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      });
    }

    if (os.statusOrdemServico !== OrdemStatus.ABERTO) {
      const inicioRef = os.inicioEm ?? dataAberturaOuCriacao(os);
      push(this.parseTs(inicioRef), {
        icon: 'play_circle',
        filled: true,
        title: 'Início da Manutenção',
        timestamp: this.formatarData(inicioRef),
        author: this.nomeTecnicoResolvido(os),
        iconBg: 'bg-secondary/10',
        iconColor: 'text-secondary',
      });
    }

    const stored = getOsTimelineEvents(os.idOrdemServico);
    const temAguardarRegistrado = stored.some((e) => e.kind === 'AGUARDANDO_PECA');

    for (const s of stored) {
      const ts = this.parseTs(s.em);
      if (s.kind === 'AGUARDANDO_PECA') {
        push(ts, {
          icon: 'schedule',
          filled: true,
          title: 'Atendimento pausado — aguardando peça',
          timestamp: this.formatarData(s.em),
          author: s.autorNome,
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-500',
        });
      } else {
        push(ts, {
          icon: 'play_circle',
          filled: true,
          title: 'Atendimento retomado',
          timestamp: this.formatarData(s.em),
          author: s.autorNome,
          iconBg: 'bg-secondary/10',
          iconColor: 'text-secondary',
        });
      }
    }

    if (agLog?.logs?.length) {
      const sortedLogs = [...agLog.logs].sort(
        (a, b) => this.parseTs(a.aguardandoPecaInicio) - this.parseTs(b.aguardandoPecaInicio),
      );
      for (const row of sortedLogs) {
        push(this.parseTs(row.aguardandoPecaInicio), {
          icon: 'inventory_2',
          filled: true,
          title: 'Período em aguardando peça — início',
          timestamp: this.formatarData(row.aguardandoPecaInicio),
          author: 'Registo do sistema',
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-600',
        });
        if (row.aguardandoPecaFim) {
          push(this.parseTs(row.aguardandoPecaFim), {
            icon: 'inventory_2',
            filled: false,
            title: 'Período em aguardando peça — fim',
            timestamp: this.formatarData(row.aguardandoPecaFim),
            author: 'Registo do sistema',
            iconBg: 'bg-surface-container-highest',
            iconColor: 'text-amber-600',
          });
        }
      }
    }

    if (os.statusOrdemServico === OrdemStatus.AGUARDANDO_PECA && !temAguardarRegistrado && !agLog?.logs?.length) {
      push(this.parseTs(os.dataAtualizacao), {
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
      push(this.parseTs(os.conclusaoEm ?? os.dataAtualizacao), {
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

    if (os.statusOrdemServico === OrdemStatus.CANCELADO) {
      push(this.parseTs(os.dataAtualizacao), {
        icon: 'cancel',
        filled: true,
        title: 'Ordem de Serviço Cancelada',
        timestamp: this.formatarData(os.dataAtualizacao),
        author: this.nomeTecnicoResolvido(os),
        iconBg: 'bg-error/10',
        iconColor: 'text-error',
      });
    }

    entries.sort((a, b) => a.ts - b.ts);
    return entries.map((e) => e.ev);
  }

  /**
   * Data de abertura para o cabeçalho e timeline. Usa `aberturaEm` da API ou `dataCriacao`.
   */
  dataAberturaParaExibicao(os: OrdemServico): Date | string | undefined {
    return dataAberturaOuCriacao(os);
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

  /**
   * Horas decimais da API → `HH:MM` com sufixo legível (min / hora / horas).
   * Evita mostrar só "0 h" quando o trabalho foi inferior a 1 hora.
   */
  formatarHorasNumero(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
    const totalMin = Math.max(0, Math.round(Number(n) * 60));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    if (h === 0) return `${hh}:${mm} min`;
    if (m === 0) return h === 1 ? `${hh}:00 hora` : `${hh}:00 horas`;
    return `${hh}:${mm} min`;
  }

  /** Total em aguardando peça: API do log; senão campo da OS. */
  formatarHorasAguardandoPecaNoPainel(): string {
    if (!this.os) return '0 h';
    const fromLog = this.aguardandoPecaLog?.totalHorasAguardando;
    if (typeof fromLog === 'number' && !Number.isNaN(fromLog)) {
      return `${fromLog.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h`;
    }
    const n = this.os.horasAguardandoPecaAcumuladas;
    const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
    return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h`;
  }

  onAtualizarTecnico(): void {
    if (!this.os) return;
    const id = this.selectedTecnico?.trim();
    if (!id) {
      this.dialogTitulo = 'Campo obrigatório';
      this.dialogMensagem = 'Selecione um técnico responsável. Não é permitido remover a atribuição.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }
    const atual = this.os.idTecnico?.trim() ?? '';
    if (id === atual) {
      return;
    }
    this.atualizandoTecnico = true;
    this.ordemService
      .atualizar(this.os.idOrdemServico, { idTecnico: id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (osAtualizada) => {
          this.os = osAtualizada;
          this.selectedTecnico = osAtualizada.idTecnico?.trim() ?? '';
          this.timelineEvents = this.generateTimeline(osAtualizada, this.aguardandoPecaLog);
          this.atualizandoTecnico = false;
          this.dialogTitulo = 'Sucesso';
          this.dialogMensagem = 'Técnico responsável atualizado com sucesso.';
          this.dialogTipo = 'info';
          this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.erro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao atualizar técnico responsável.');
          this.atualizandoTecnico = false;
          this.cdr.markForCheck();
        },
      });
  }

  onEncerrar(): void {
    const { descricaoServico, pecasUtilizadas } = this.fechamentoForm;
    const vazios: string[] = [];
    if (!descricaoServico?.trim()) vazios.push('Descrição do Serviço');
    if (!pecasUtilizadas?.trim()) vazios.push('Peças Utilizadas');
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
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (osAtualizada) => {
          this.os = osAtualizada;
          this.timelineEvents = this.generateTimeline(osAtualizada, this.aguardandoPecaLog);
          this.fechamentoForm = { descricaoServico: '', pecasUtilizadas: '' };
          this.encerrando = false;
          this.dialogTitulo = 'Sucesso';
          this.dialogMensagem = 'Ordem de serviço encerrada com sucesso.';
          this.dialogTipo = 'info';
          this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.fechamentoErro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao encerrar a ordem de serviço.');
          this.encerrando = false;
          this.cdr.markForCheck();
        },
      });
  }

  onVoltar(): void {
    this.router.navigate(['/app/ordens']);
  }

  onDialogAcao(acao: string): void {
    this.dialogVisivel = false;
    if (acao === 'confirmar' && this.dialogCallback) {
      this.dialogCallback();
    }
    this.dialogCallback = null;
  }

  abrirModalIniciar(): void {
    if (!this.os) return;
    this.osParaIniciar = this.os;
    this.showModalIniciar = true;
    this.cdr.markForCheck();
  }

  abrirModalEditar(): void {
    if (!this.os) return;
    this.osEmEdicao = this.os;
    this.showModalEdicao = true;
    this.cdr.markForCheck();
  }

  onModalEdicaoFechar(): void {
    this.showModalEdicao = false;
    this.osEmEdicao = null;
    this.cdr.markForCheck();
  }

  onOsAtualizada(overlayCamposEditados?: Partial<OrdemServico>): void {
    this.showModalEdicao = false;
    this.osEmEdicao = null;
    this.recarregarDetalhe('Ordem de serviço atualizada com sucesso.', overlayCamposEditados);
  }

  onModalIniciarFechar(): void {
    this.showModalIniciar = false;
    this.osParaIniciar = null;
    this.cdr.markForCheck();
  }

  onOsIniciada(): void {
    this.showModalIniciar = false;
    this.osParaIniciar = null;
    this.recarregarDetalhe('A ordem de serviço foi iniciada com sucesso.');
  }

  onAguardarPeca(): void {
    if (!this.os) return;
    if (this.os.statusOrdemServico !== OrdemStatus.EM_ANDAMENTO) return;

    if (!this.podeAcaoComoAdminOuTecnicoAtribuido) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem =
        'Somente o técnico atribuído e administradores podem marcar a ordem como aguardando peça.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }

    const osId = this.os.idOrdemServico;
    this.dialogTitulo = 'Marcar como Aguardando Peça';
    this.dialogMensagem = 'Deseja marcar esta ordem de serviço como aguardando peça?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogCallback = () => {
      const payload = { statusOrdemServico: OrdemStatus.AGUARDANDO_PECA };
      this.ordemService.atualizar(osId, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'AGUARDANDO_PECA', this.nomeParaTimeline());
          this.recarregarDetalhe('A ordem foi marcada como aguardando peça.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = mensagemUsuarioErroApiOrdemServico(err, 'Não foi possível marcar como aguardando peça.');
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
    };
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  onRetomarAtendimento(): void {
    if (!this.os) return;
    if (this.os.statusOrdemServico !== OrdemStatus.AGUARDANDO_PECA) return;

    if (!this.podeAcaoComoAdminOuTecnicoAtribuido) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem =
        'Somente o técnico atribuído e administradores podem retomar o atendimento.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }

    const osId = this.os.idOrdemServico;
    this.dialogTitulo = 'Retomar atendimento';
    this.dialogMensagem = 'Deseja retomar o atendimento desta ordem de serviço?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogCallback = () => {
      const payload: { statusOrdemServico: OrdemStatus } = {
        statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
      };
      this.ordemService.atualizar(osId, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'RETOMADA', this.nomeParaTimeline());
          this.recarregarDetalhe('O atendimento foi retomado com sucesso.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = mensagemUsuarioErroApiOrdemServico(err, 'Não foi possível retomar o atendimento.');
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
    };
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  onCancelarOrdemServico(): void {
    if (!this.os) return;
    if (this.os.statusOrdemServico !== OrdemStatus.AGUARDANDO_PECA) return;

    if (!this.podeAcaoComoAdminOuTecnicoAtribuido) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem =
        'Somente o técnico atribuído e administradores podem cancelar a ordem de serviço.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }

    const osId = this.os.idOrdemServico;
    this.dialogTitulo = 'Cancelar ordem de serviço';
    this.dialogMensagem =
      'Deseja cancelar esta ordem de serviço? O atendimento não será concluído e o status passará a Cancelado.';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim, cancelar', acao: 'confirmar', estilo: 'perigo' },
    ];
    this.dialogCallback = () => {
      this.ordemService
        .atualizar(osId, { statusOrdemServico: OrdemStatus.CANCELADO })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.recarregarDetalhe('A ordem de serviço foi cancelada.');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.dialogTitulo = 'Erro';
            this.dialogMensagem = mensagemUsuarioErroApiOrdemServico(err, 'Não foi possível cancelar a ordem de serviço.');
            this.dialogTipo = 'erro';
            this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
            this.dialogCallback = null;
            this.dialogVisivel = true;
            this.cdr.markForCheck();
          },
        });
    };
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  private nomeParaTimeline(): string {
    return this.authService.getCurrentUser()?.nomeUsuario?.trim() || 'Usuário';
  }

  private recarregarDetalhe(mensagemSucesso?: string, overlayCamposEditados?: Partial<OrdemServico>): void {
    const osId = this.route.snapshot.paramMap.get('id');
    if (!osId) return;
    forkJoin({
      os: this.ordemService.buscarPorId(osId),
      equipamentos: this.equipamentoService.listar(),
      agLog: this.ordemService.buscarAguardandoPecaLog(osId).pipe(
        catchError(() => of<AguardandoPecaLogResponse>({ totalHorasAguardando: 0, logs: [] })),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ os, equipamentos, agLog }) => {
          const osFinal =
            overlayCamposEditados !== undefined
              ? { ...os, ...overlayCamposEditados }
              : os;
          this.os = osFinal;
          this.aguardandoPecaLog = agLog;
          this.selectedTecnico = osFinal.idTecnico?.trim() ? osFinal.idTecnico.trim() : '';
          this.equipamento = equipamentos.find((e) => e.id === osFinal.idEquipamento) || null;
          this.timelineEvents = this.generateTimeline(osFinal, agLog);
          if (mensagemSucesso !== undefined) {
            this.dialogTitulo = 'Sucesso';
            this.dialogMensagem = mensagemSucesso;
            this.dialogTipo = 'info';
            this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
            this.dialogCallback = null;
            this.dialogVisivel = true;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Não foi possível recarregar a ordem de serviço.';
          this.cdr.markForCheck();
        },
      });
  }

  getIconSettings(filled: boolean | undefined | null): string {
    return !!filled ? "'FILL' 1" : "'FILL' 0";
  }
}
