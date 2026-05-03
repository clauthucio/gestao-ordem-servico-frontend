import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { OsFormComponent } from '../../components/os-form/os-form';
import { UserRole } from '../../core/enums/roles.enum';
import { OrdemStatus } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { compararNumeroOrdemServico } from '../../core/utils/numero-ordem-servico.util';
import { statusOsViewBadgeColorClasses } from '../../core/utils/status-badge.util';
import { appendOsTimelineEvent } from '../../core/storage/os-timeline-local.storage';
import { usuarioPodeAcaoComoAdminOuTecnicoAtribuido } from '../../core/utils/os-acoes-permissao.util';

export type PrioridadeOS = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusOS = 'aberto' | 'execucao' | 'pendente' | 'finalizada' | 'cancelada';

export type ColunaOrdenacaoOs =
  | 'numero'
  | 'equipamento'
  | 'tipo'
  | 'prioridade'
  | 'status'
  | 'tecnico'
  | 'abertura';

export interface OrdemServicoTabela {
  id: string;
  numero: string;
  equipamento: string;
  tipo: string;
  prioridade: PrioridadeOS;
  status: StatusOS;
  statusOrdemServico: OrdemStatus; // Para validações no dropdown
  tecnico: string | null;
  idTecnico: string | null; // Para validação de permissão
  dataAbertura: string;
  /** Epoch ms para ordenação sem parsear texto formatado */
  aberturaTimestamp: number;
}

@Component({
  selector: 'app-os-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ModalContainerComponent, OsFormComponent, DialogComponent],
  templateUrl: './os-list.html'
})
export class OsList implements OnInit {
  private readonly ordemService = inject(OrdemServicoService);
  private readonly equipamentoService = inject(EquipamentoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  titulo = 'Inventário de Ordens de Serviço';
  subtitulo = 'Gerencie e monitore todas as solicitações de manutenção do polo.';

  busca = '';
  filtroStatus = 'todos';
  filtroPrioridade = 'todas';
  carregando = true;
  erro: string | null = null;
  showModal = false;

  ordenacaoColuna: ColunaOrdenacaoOs = 'abertura';
  ordenacaoDirecao: 'asc' | 'desc' = 'desc';

  paginaAtual = 1;
  itensPorPagina = 10;

  tecnicoNomeMap = new Map<string, string>();
  equipamentoNomeMap = new Map<string, string>();
  ordens: OrdemServicoTabela[] = [];
  ordensRaw: OrdemServico[] = [];

  // Estado do dropdown de ações por linha
  acaoAbertaId: string | null = null;

  // Estado do modal de edição
  osEmEdicao: OrdemServico | null = null;
  showModalEdicao = false;

  // Estado do Dialog
  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];
  private dialogCallback: (() => void) | null = null;

  // Estado do modal de Iniciar
  osParaIniciar: OrdemServico | null = null;
  showModalIniciar = false;

  // Estado do modal de Encerrar
  osParaEncerrar: OrdemServico | null = null;
  showModalEncerrar = false;

  @HostListener('document:click')
  fecharDropdown(): void {
    this.acaoAbertaId = null;
  }

  ngOnInit(): void {
    console.log('[OsList] ngOnInit chamado');
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar(),
      equipamentos: this.equipamentoService.listar(),
    }).subscribe({
      next: ({ ordens, usuarios, equipamentos }) => {
        console.log('[OsList] next disparado, ordens=', ordens.length, 'usuarios=', usuarios.length);
        try {
          this.equipamentoNomeMap.clear();
          equipamentos.forEach((e) => this.equipamentoNomeMap.set(e.id, e.nome));

          this.tecnicoNomeMap.clear();
          usuarios
            .filter((usuario) => usuario.perfilUsuario === UserRole.TECNICO)
            .forEach((usuario) => this.tecnicoNomeMap.set(usuario.idUsuario, usuario.nomeUsuario));

          this.ordensRaw = ordens;
          this.ordens = ordens.map((ordem) => this.mapearOrdem(ordem));
          this.paginaAtual = 1;
          this.carregando = false;
          this.cdr.markForCheck();
        } catch (err) {
          console.error('[OsList] Erro ao mapear ordens:', err);
          this.erro = 'Erro ao processar os dados das ordens de serviço.';
          this.carregando = false;
        }
      },
      error: (error) => {
        console.error('[OsList] Erro ao carregar ordens:', error);
        this.erro = 'Não foi possível carregar as ordens de serviço.';
        this.carregando = false;
      },
    });
  }

  get ordensFiltradas(): OrdemServicoTabela[] {
    const termo = this.busca.trim().toLocaleLowerCase();

    const filtradas = this.ordens.filter((ordem) => {
      const atendeBusca = !termo || [
        ordem.numero,
        ordem.equipamento,
        ordem.tipo,
        ordem.tecnico ?? '',
      ].some((valor) => valor.toLocaleLowerCase().includes(termo));

      const atendeStatus = this.filtroStatus === 'todos' || ordem.status === this.filtroStatus;
      const atendePrioridade = this.filtroPrioridade === 'todas' || ordem.prioridade === this.filtroPrioridade;

      return atendeBusca && atendeStatus && atendePrioridade;
    });

    const lista = [...filtradas];
    this.ordenarListaOs(lista, this.ordenacaoColuna, this.ordenacaoDirecao);
    return lista;
  }

  onFiltroAlterado(): void {
    this.paginaAtual = 1;
  }

  onToggleOrdenacao(col: ColunaOrdenacaoOs, event: MouseEvent): void {
    event.stopPropagation();
    if (this.ordenacaoColuna === col) {
      this.ordenacaoDirecao = this.ordenacaoDirecao === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordenacaoColuna = col;
      this.ordenacaoDirecao = 'asc';
    }
    this.paginaAtual = 1;
    this.cdr.markForCheck();
  }

  iconeOrdenacaoColuna(col: ColunaOrdenacaoOs): string {
    if (this.ordenacaoColuna !== col) return 'unfold_more';
    return this.ordenacaoDirecao === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ordenacaoColunaAtiva(col: ColunaOrdenacaoOs): boolean {
    return this.ordenacaoColuna === col;
  }

  limparFiltrosEOrdenacao(): void {
    this.busca = '';
    this.filtroStatus = 'todos';
    this.filtroPrioridade = 'todas';
    this.ordenacaoColuna = 'abertura';
    this.ordenacaoDirecao = 'desc';
    this.paginaAtual = 1;
    this.cdr.markForCheck();
  }

  private ordenarListaOs(lista: OrdemServicoTabela[], col: ColunaOrdenacaoOs, dir: 'asc' | 'desc'): void {
    const m = dir === 'asc' ? 1 : -1;
    const cmpStr = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

    lista.sort((x, y) => {
      let c = 0;
      switch (col) {
        case 'numero':
          c = compararNumeroOrdemServico(x.numero, y.numero);
          break;
        case 'equipamento':
          c = cmpStr(x.equipamento, y.equipamento);
          break;
        case 'tipo':
          c = cmpStr(x.tipo, y.tipo);
          break;
        case 'prioridade':
          c = this.prioridadeNivel(x.prioridade) - this.prioridadeNivel(y.prioridade);
          break;
        case 'status':
          c = this.statusNivel(x.status) - this.statusNivel(y.status);
          break;
        case 'tecnico': {
          const ta = (x.tecnico ?? '\uffff').toLocaleLowerCase();
          const tb = (y.tecnico ?? '\uffff').toLocaleLowerCase();
          c = cmpStr(ta, tb);
          break;
        }
        case 'abertura':
          c = x.aberturaTimestamp - y.aberturaTimestamp;
          break;
        default:
          c = 0;
      }
      if (c === 0) {
        c = x.id.localeCompare(y.id);
      }
      return c * m;
    });
  }

  private prioridadeNivel(p: PrioridadeOS): number {
    const n: Record<PrioridadeOS, number> = { baixa: 0, media: 1, alta: 2, critica: 3 };
    return n[p];
  }

  private statusNivel(s: StatusOS): number {
    const n: Record<StatusOS, number> = {
      aberto: 0,
      execucao: 1,
      pendente: 2,
      finalizada: 3,
      cancelada: 4,
    };
    return n[s];
  }

  get ordensPaginadas(): OrdemServicoTabela[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.ordensFiltradas.slice(inicio, inicio + this.itensPorPagina);
  }

  get totalItens(): number {
    return this.ordensFiltradas.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalItens / this.itensPorPagina));
  }

  get paginaInicial(): number {
    if (this.totalItens === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get paginaFinal(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  get paginasVisiveis(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, indice) => indice + 1).slice(0, 3);
  }

  private mapearOrdem(ordem: OrdemServico): OrdemServicoTabela {
    const ts = ordem.aberturaEm ? new Date(ordem.aberturaEm).getTime() : 0;
    return {
      id: ordem.idOrdemServico,
      numero: ordem.numeroOrdemServico,
      equipamento: ordem.idEquipamento
        ? this.equipamentoNomeMap.get(ordem.idEquipamento) ?? 'N/D'
        : 'N/D',
      tipo: ordem.tipoManutencao ? this.formatarTipo(ordem.tipoManutencao) : 'N/D',
      prioridade: ordem.prioridadeOrdemServico ? this.mapearPrioridade(ordem.prioridadeOrdemServico) : 'baixa',
      status: ordem.statusOrdemServico ? this.mapearStatus(ordem.statusOrdemServico) : 'aberto',
      statusOrdemServico: ordem.statusOrdemServico as OrdemStatus,
      tecnico: ordem.idTecnico ? this.tecnicoNomeMap.get(ordem.idTecnico) ?? ordem.tecnicoNome ?? null : null,
      idTecnico: ordem.idTecnico ?? null,
      dataAbertura: ordem.aberturaEm ? this.formatarData(ordem.aberturaEm) : 'N/D',
      aberturaTimestamp: Number.isFinite(ts) ? ts : 0,
    };
  }

  private mapearPrioridade(prioridade: OrdemServico['prioridadeOrdemServico']): PrioridadeOS {
    return prioridade.toLocaleLowerCase() as PrioridadeOS;
  }

  private mapearStatus(status: OrdemStatus): StatusOS {
    const mapa: Record<OrdemStatus, StatusOS> = {
      [OrdemStatus.ABERTO]: 'aberto',
      [OrdemStatus.EM_ANDAMENTO]: 'execucao',
      [OrdemStatus.AGUARDANDO_PECA]: 'pendente',
      [OrdemStatus.CONCLUIDO]: 'finalizada',
      [OrdemStatus.CANCELADO]: 'cancelada',
    };

    return mapa[status];
  }

  private formatarTipo(tipo: OrdemServico['tipoManutencao']): string {
    return `${tipo.charAt(0)}${tipo.slice(1).toLocaleLowerCase()}`;
  }

  private formatarData(data: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(data));
  }

  getPrioridadeClass(prioridade: PrioridadeOS): string {
    const map: Record<PrioridadeOS, string> = {
      baixa: 'bg-blue-100 text-blue-700',
      media: 'bg-green-100 text-green-700',
      alta: 'bg-yellow-100 text-yellow-700',
      critica: 'bg-red-100 text-red-700'
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
    return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusOsViewBadgeColorClasses(status)}`;
  }

  getStatusLabel(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberto: 'Em Aberto',
      execucao: 'Em Execução',
      pendente: 'Pendente',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada'
    };
    return map[status];
  }

  onNovaOS(): void {
    this.showModal = true;
  }

  onModalFechar(): void {
    this.showModal = false;
  }

  onModalEdicaoFechar(): void {
    this.showModalEdicao = false;
    this.osEmEdicao = null;
  }

  onOsSalva(): void {
    this.showModal = false;
    this.recarregar('Ordem de serviço cadastrada com sucesso.');
  }

  onOsAtualizada(): void {
    this.showModalEdicao = false;
    this.osEmEdicao = null;
    this.recarregar();
  }

  onModalIniciarFechar(): void {
    this.showModalIniciar = false;
    this.osParaIniciar = null;
  }

  onOsIniciada(): void {
    this.showModalIniciar = false;
    this.osParaIniciar = null;
    this.recarregar('A ordem de serviço foi iniciada com sucesso.');
  }

  onModalEncerrarFechar(): void {
    this.showModalEncerrar = false;
    this.osParaEncerrar = null;
  }

  onOsEncerrada(): void {
    this.showModalEncerrar = false;
    this.osParaEncerrar = null;
    this.recarregar();
  }

  isUserAdminOrAssignedTecnico(os: OrdemServico | OrdemServicoTabela): boolean {
    const idTecnico = 'idTecnico' in os ? os.idTecnico : (os as OrdemServico).idTecnico;
    return usuarioPodeAcaoComoAdminOuTecnicoAtribuido(this.authService.getCurrentUser(), idTecnico);
  }

  onIniciarOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find(o => o.idOrdemServico === osId);
    if (!os) return;
    this.osParaIniciar = os;
    this.showModalIniciar = true;
  }

  onEncerrarOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find(o => o.idOrdemServico === osId);
    if (!os) return;

    // Validar permissão
    if (!this.isUserAdminOrAssignedTecnico(os)) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem = 'Somente o técnico atribuído e administradores podem encerrar uma ordem de serviço.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      return;
    }

    this.osParaEncerrar = os;
    this.showModalEncerrar = true;
  }

  private nomeParaTimeline(): string {
    return this.authService.getCurrentUser()?.nomeUsuario?.trim() || 'Usuário';
  }

  onAguardarPecaOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find(o => o.idOrdemServico === osId);
    if (!os) return;
    if (os.statusOrdemServico !== OrdemStatus.EM_ANDAMENTO) return;

    if (!this.isUserAdminOrAssignedTecnico(os)) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem =
        'Somente o técnico atribuído e administradores podem marcar a ordem como aguardando peça.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      return;
    }

    this.dialogTitulo = 'Marcar como Aguardando Peça';
    this.dialogMensagem = 'Deseja marcar esta ordem de serviço como aguardando peça?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogCallback = () => {
      const payload: any = {
        statusOrdemServico: OrdemStatus.AGUARDANDO_PECA,
      };
      this.ordemService.atualizar(osId, payload).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'AGUARDANDO_PECA', this.nomeParaTimeline());
          this.recarregar('A ordem foi marcada como aguardando peça.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = err?.error?.message ?? 'Não foi possível marcar como aguardando peça.';
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
    };
    this.dialogVisivel = true;
  }

  onRetomarAtendimentoOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find((o) => o.idOrdemServico === osId);
    if (!os) return;
    if (os.statusOrdemServico !== OrdemStatus.AGUARDANDO_PECA) return;

    if (!this.isUserAdminOrAssignedTecnico(os)) {
      this.dialogTitulo = 'Permissão negada';
      this.dialogMensagem =
        'Somente o técnico atribuído e administradores podem retomar o atendimento.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      return;
    }

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
      this.ordemService.atualizar(osId, payload).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'RETOMADA', this.nomeParaTimeline());
          this.recarregar('O atendimento foi retomado com sucesso.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = err?.error?.message ?? 'Não foi possível retomar o atendimento.';
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
    };
    this.dialogVisivel = true;
  }

  abrirMenuAcao(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = this.acaoAbertaId === osId ? null : osId;
  }

  onEditarOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find(o => o.idOrdemServico === osId);
    if (!os) return;
    this.osEmEdicao = os;
    this.showModalEdicao = true;
  }

  onExcluirOS(osId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = null;
    const os = this.ordensRaw.find(o => o.idOrdemServico === osId);
    if (!os) return;

    if (os.statusOrdemServico !== OrdemStatus.ABERTO) {
      this.dialogTitulo = 'Exclusão não permitida';
      this.dialogMensagem = 'Só é possível excluir OS que estiverem "EM ABERTO".';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      return;
    }

    this.dialogTitulo = 'Confirmar Exclusão';
    this.dialogMensagem = `Tem certeza que deseja excluir a OS "${os.numeroOrdemServico}"? Esta ação não pode ser desfeita.`;
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Cancelar', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Excluir', acao: 'confirmar', estilo: 'perigo' },
    ];
    this.dialogCallback = () => this.executarExclusao(osId);
    this.dialogVisivel = true;
  }

  private executarExclusao(osId: string): void {
    this.ordemService.deletar(osId).subscribe({
      next: () => {
        this.recarregar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.dialogTitulo = 'Erro ao excluir';
        this.dialogMensagem = err?.error?.message ?? 'Não foi possível excluir a ordem de serviço.';
        this.dialogTipo = 'erro';
        this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
        this.dialogCallback = null;
        this.dialogVisivel = true;
        this.cdr.markForCheck();
      },
    });
  }

  onDialogAcao(acao: string): void {
    this.dialogVisivel = false;
    if (acao === 'confirmar' && this.dialogCallback) {
      this.dialogCallback();
    }
    this.dialogCallback = null;
  }

  private recarregar(mensagemSucesso?: string): void {
    this.carregando = true;
    this.erro = null;
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar(),
      equipamentos: this.equipamentoService.listar(),
    }).subscribe({
      next: ({ ordens, usuarios, equipamentos }) => {
        this.equipamentoNomeMap.clear();
        equipamentos.forEach((e) => this.equipamentoNomeMap.set(e.id, e.nome));
        this.tecnicoNomeMap.clear();
        usuarios
          .filter((u) => u.perfilUsuario === UserRole.TECNICO)
          .forEach((u) => this.tecnicoNomeMap.set(u.idUsuario, u.nomeUsuario));
        this.ordensRaw = ordens;
        this.ordens = ordens.map((o) => this.mapearOrdem(o));
        this.paginaAtual = 1;
        this.carregando = false;
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
      error: (err) => {
        console.error('[OsList] Erro ao recarregar ordens:', err);
        this.erro = 'Não foi possível recarregar as ordens de serviço.';
        this.carregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onVerDetalhes(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.acaoAbertaId = null;
    this.router.navigate(['/app/ordens', id]);
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
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;
  }
}
