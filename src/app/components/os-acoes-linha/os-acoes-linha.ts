import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { DialogComponent, DialogBotao } from '../dialog/dialog.component';
import { ModalContainerComponent } from '../modal-container/modal-container';
import { OsFormComponent } from '../os-form/os-form';
import { OrdemStatus } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';
import { AuthService } from '../../core/services/auth.service';
import { appendOsTimelineEvent } from '../../core/storage/os-timeline-local.storage';
import { usuarioPodeAcaoComoAdminOuTecnicoAtribuido } from '../../core/utils/os-acoes-permissao.util';

@Component({
  selector: 'app-os-acoes-linha',
  standalone: true,
  imports: [CommonModule, DialogComponent, ModalContainerComponent, OsFormComponent],
  templateUrl: './os-acoes-linha.html',
})
export class OsAcoesLinhaComponent implements OnChanges {
  private readonly ordemService = inject(OrdemServicoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  /** OS completa da linha (mutável após recarga no pai). */
  @Input({ required: true }) ordem!: OrdemServico;

  /** Emite após mutação bem-sucedida; valor opcional = mensagem de sucesso para o pai exibir. */
  @Output() dadosAlterados = new EventEmitter<string | undefined>();

  menuAberto = false;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];
  private dialogCallback: (() => void) | null = null;

  osEmEdicao: OrdemServico | null = null;
  showModalEdicao = false;

  osParaIniciar: OrdemServico | null = null;
  showModalIniciar = false;

  osParaEncerrar: OrdemServico | null = null;
  showModalEncerrar = false;

  readonly OrdemStatus = OrdemStatus;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ordem']) {
      this.menuAberto = false;
    }
  }

  @HostListener('document:click')
  fecharMenuPorClickExterno(): void {
    this.menuAberto = false;
  }

  private fecharMenuEPropagacao(ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.menuAberto = false;
  }

  isUserAdminOrAssignedTecnico(os: OrdemServico): boolean {
    return usuarioPodeAcaoComoAdminOuTecnicoAtribuido(this.authService.getCurrentUser(), os.idTecnico);
  }

  abrirMenuAcao(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.menuAberto = !this.menuAberto;
  }

  onVerDetalhes(ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.menuAberto = false;
    void this.router.navigate(['/app/ordens', this.ordem.idOrdemServico]);
  }

  onEditarOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    this.osEmEdicao = this.ordem;
    this.showModalEdicao = true;
  }

  onModalEdicaoFechar(): void {
    this.showModalEdicao = false;
    this.osEmEdicao = null;
  }

  onOsAtualizada(): void {
    this.onModalEdicaoFechar();
    this.dadosAlterados.emit(undefined);
  }

  onIniciarOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    this.osParaIniciar = this.ordem;
    this.showModalIniciar = true;
  }

  onModalIniciarFechar(): void {
    this.showModalIniciar = false;
    this.osParaIniciar = null;
  }

  onOsIniciada(): void {
    this.onModalIniciarFechar();
    this.dadosAlterados.emit('A ordem de serviço foi iniciada com sucesso.');
  }

  onEncerrarOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    if (this.ordem.statusOrdemServico !== OrdemStatus.EM_ANDAMENTO) return;
    if (!this.isUserAdminOrAssignedTecnico(this.ordem)) {
      this.abrirDialogErro(
        'Permissão negada',
        'Somente o técnico atribuído e administradores podem encerrar uma ordem de serviço.'
      );
      return;
    }
    this.osParaEncerrar = this.ordem;
    this.showModalEncerrar = true;
  }

  onModalEncerrarFechar(): void {
    this.showModalEncerrar = false;
    this.osParaEncerrar = null;
  }

  onOsEncerrada(): void {
    this.onModalEncerrarFechar();
    this.dadosAlterados.emit(undefined);
  }

  private nomeParaTimeline(): string {
    return this.authService.getCurrentUser()?.nomeUsuario?.trim() || 'Usuário';
  }

  private abrirDialogErro(titulo: string, mensagem: string): void {
    this.dialogTitulo = titulo;
    this.dialogMensagem = mensagem;
    this.dialogTipo = 'erro';
    this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
    this.dialogCallback = null;
    this.dialogVisivel = true;
  }

  onAguardarPecaOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    if (this.ordem.statusOrdemServico !== OrdemStatus.EM_ANDAMENTO) return;
    if (!this.isUserAdminOrAssignedTecnico(this.ordem)) {
      this.abrirDialogErro(
        'Permissão negada',
        'Somente o técnico atribuído e administradores podem marcar a ordem como aguardando peça.'
      );
      return;
    }
    const osId = this.ordem.idOrdemServico;
    this.dialogTitulo = 'Marcar como Aguardando Peça';
    this.dialogMensagem = 'Deseja marcar esta ordem de serviço como aguardando peça?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogCallback = () => {
      this.ordemService.atualizar(osId, { statusOrdemServico: OrdemStatus.AGUARDANDO_PECA }).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'AGUARDANDO_PECA', this.nomeParaTimeline());
          this.dadosAlterados.emit('A ordem foi marcada como aguardando peça.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.abrirDialogErro('Erro', err?.error?.message ?? 'Não foi possível marcar como aguardando peça.');
        },
      });
    };
    this.dialogVisivel = true;
  }

  onRetomarAtendimentoOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    if (this.ordem.statusOrdemServico !== OrdemStatus.AGUARDANDO_PECA) return;
    if (!this.isUserAdminOrAssignedTecnico(this.ordem)) {
      this.abrirDialogErro(
        'Permissão negada',
        'Somente o técnico atribuído e administradores podem retomar o atendimento.'
      );
      return;
    }
    const osId = this.ordem.idOrdemServico;
    this.dialogTitulo = 'Retomar atendimento';
    this.dialogMensagem = 'Deseja retomar o atendimento desta ordem de serviço?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogCallback = () => {
      this.ordemService.atualizar(osId, { statusOrdemServico: OrdemStatus.EM_ANDAMENTO }).subscribe({
        next: () => {
          appendOsTimelineEvent(osId, 'RETOMADA', this.nomeParaTimeline());
          this.dadosAlterados.emit('O atendimento foi retomado com sucesso.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.abrirDialogErro('Erro', err?.error?.message ?? 'Não foi possível retomar o atendimento.');
        },
      });
    };
    this.dialogVisivel = true;
  }

  onCancelarOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    if (this.ordem.statusOrdemServico !== OrdemStatus.AGUARDANDO_PECA) return;
    if (!this.isUserAdminOrAssignedTecnico(this.ordem)) {
      this.abrirDialogErro(
        'Permissão negada',
        'Somente o técnico atribuído e administradores podem cancelar a ordem de serviço.'
      );
      return;
    }
    const osId = this.ordem.idOrdemServico;
    this.dialogTitulo = 'Cancelar ordem de serviço';
    this.dialogMensagem =
      'Deseja cancelar esta ordem de serviço? O atendimento não será concluído e o status passará a Cancelado.';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim, cancelar', acao: 'confirmar', estilo: 'perigo' },
    ];
    this.dialogCallback = () => {
      this.ordemService.atualizar(osId, { statusOrdemServico: OrdemStatus.CANCELADO }).subscribe({
        next: () => {
          this.dadosAlterados.emit('A ordem de serviço foi cancelada.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.abrirDialogErro(
            'Erro',
            err?.error?.message ?? 'Não foi possível cancelar a ordem de serviço.'
          );
        },
      });
    };
    this.dialogVisivel = true;
  }

  onExcluirOS(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharMenuEPropagacao();
    if (this.ordem.statusOrdemServico !== OrdemStatus.ABERTO) {
      this.abrirDialogErro('Exclusão não permitida', 'Só é possível excluir OS que estiverem "EM ABERTO".');
      return;
    }
    const osId = this.ordem.idOrdemServico;
    this.dialogTitulo = 'Confirmar Exclusão';
    this.dialogMensagem = `Tem certeza que deseja excluir a OS "${this.ordem.numeroOrdemServico}"? Esta ação não pode ser desfeita.`;
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
        this.dadosAlterados.emit(undefined);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.abrirDialogErro(
          'Erro ao excluir',
          err?.error?.message ?? 'Não foi possível excluir a ordem de serviço.'
        );
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
}
