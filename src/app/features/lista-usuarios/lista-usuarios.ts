import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { CadastroUsuario } from '../cadastro-usuario/cadastro-usuario';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { UsuarioService } from '../../core/http/usuario.service';
import { Usuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRole, ROLE_LABELS } from '../../core/enums/roles.enum';
import { extrairMensagemErroApi } from '../../core/utils/api-error-message.util';
import {
  SENHA_ALTERACAO_MAX,
  SENHA_ALTERACAO_MIN,
  senhaNovaDiferenteDaAtualValidator,
  senhasNovaConfirmacaoValidator,
} from '../../core/utils/senha-alteracao.validators';

const senhaControleValidators = [
  Validators.required,
  Validators.minLength(SENHA_ALTERACAO_MIN),
  Validators.maxLength(SENHA_ALTERACAO_MAX),
];

@Component({
  selector: 'app-lista-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalContainerComponent,
    CadastroUsuario,
    DialogComponent,
  ],
  templateUrl: './lista-usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaUsuarios implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  readonly UserRole = UserRole;
  readonly perfilFiltroOpcoes: { value: UserRole; label: string }[] = [
    { value: UserRole.ADMIN, label: ROLE_LABELS[UserRole.ADMIN] },
    { value: UserRole.TECNICO, label: ROLE_LABELS[UserRole.TECNICO] },
    { value: UserRole.SOLICITANTE, label: ROLE_LABELS[UserRole.SOLICITANTE] },
    { value: UserRole.SUPERVISOR_DE_MANUTENCAO, label: ROLE_LABELS[UserRole.SUPERVISOR_DE_MANUTENCAO] },
  ];

  readonly formSenha = this.fb.nonNullable.group(
    {
      senhaAtual: ['', senhaControleValidators],
      senhaNova: ['', senhaControleValidators],
      confirmarSenha: ['', senhaControleValidators],
    },
    {
      validators: [senhasNovaConfirmacaoValidator(), senhaNovaDiferenteDaAtualValidator()],
    },
  );

  usuarios: Usuario[] = [];
  /** Atualizado em `recomputarListaFiltrada` — evita refiltrar a cada ciclo de detecção. */
  usuariosFiltradosList: Usuario[] = [];

  carregando = true;
  erro: string | null = null;

  filtroNome = '';
  filtroPerfil: UserRole | '' = '';
  filtroStatus: 'todos' | 'ativo' | 'inativo' = 'todos';

  paginaAtual = 1;
  readonly itensPorPagina = 10;

  showModalCadastro = false;
  showModalAlterarSenha = false;
  usuarioSenhaAlvo: Usuario | null = null;
  salvandoSenha = false;
  erroApiSenha: string | null = null;

  acaoAbertaId: string | null = null;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];
  private dialogCallback: (() => void) | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  @HostListener('document:click')
  fecharMenuAcoes(): void {
    if (this.acaoAbertaId !== null) {
      this.acaoAbertaId = null;
      this.cdr.markForCheck();
    }
  }

  private fecharMenuAcaoLinha(): void {
    if (this.acaoAbertaId === null) {
      return;
    }
    this.acaoAbertaId = null;
    this.cdr.markForCheck();
  }

  /** Somente a própria conta pode ter a senha alterada por esta tela. */
  podeAlterarSenhaDoProprioUsuario(u: Usuario): boolean {
    const atual = this.authService.getCurrentUser();
    return !!atual?.idUsuario && atual.idUsuario === u.idUsuario;
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.cdr.markForCheck();
    this.usuarioService.listar().subscribe({
      next: (lista) => {
        this.usuarios = lista;
        this.paginaAtual = 1;
        this.recomputarListaFiltrada();
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar os usuários.';
        this.carregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Recalcula a lista filtrada (após mudar `usuarios` ou filtros). */
  private recomputarListaFiltrada(): void {
    let lista = [...this.usuarios];
    const termo = this.filtroNome.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((u) => {
        const nome = (u.nomeUsuario ?? '').toLowerCase();
        const email = (u.emailUsuario ?? '').toLowerCase();
        return nome.includes(termo) || email.includes(termo);
      });
    }
    if (this.filtroPerfil) {
      lista = lista.filter((u) => u.perfilUsuario === this.filtroPerfil);
    }
    if (this.filtroStatus === 'ativo') {
      lista = lista.filter((u) => u.statusUsuario);
    }
    if (this.filtroStatus === 'inativo') {
      lista = lista.filter((u) => !u.statusUsuario);
    }
    this.usuariosFiltradosList = lista;
    const maxPag = Math.max(1, Math.ceil(lista.length / this.itensPorPagina));
    if (this.paginaAtual > maxPag) {
      this.paginaAtual = maxPag;
    }
  }

  onFiltroAlterado(): void {
    this.paginaAtual = 1;
    this.recomputarListaFiltrada();
    this.cdr.markForCheck();
  }

  limparFiltros(): void {
    this.filtroNome = '';
    this.filtroPerfil = '';
    this.filtroStatus = 'todos';
    this.paginaAtual = 1;
    this.recomputarListaFiltrada();
    this.cdr.markForCheck();
  }

  get usuariosPaginados(): Usuario[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.usuariosFiltradosList.slice(inicio, inicio + this.itensPorPagina);
  }

  get totalItens(): number {
    return this.usuariosFiltradosList.length;
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

  onPaginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      this.cdr.markForCheck();
    }
  }

  onProximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
      this.cdr.markForCheck();
    }
  }

  onIrParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }
    this.paginaAtual = pagina;
    this.cdr.markForCheck();
  }

  abrirModalCadastro(): void {
    this.showModalCadastro = true;
    this.cdr.markForCheck();
  }

  abrirMenuAcao(idUsuario: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = this.acaoAbertaId === idUsuario ? null : idUsuario;
    this.cdr.markForCheck();
  }

  onAlterarSenha(usuario: Usuario, event: MouseEvent): void {
    event.stopPropagation();
    this.fecharMenuAcaoLinha();
    this.usuarioSenhaAlvo = usuario;
    this.erroApiSenha = null;
    this.formSenha.reset();
    this.showModalAlterarSenha = true;
    this.cdr.markForCheck();
  }

  fecharModalAlterarSenha(): void {
    this.showModalAlterarSenha = false;
    this.usuarioSenhaAlvo = null;
    this.erroApiSenha = null;
    this.formSenha.reset();
    this.salvandoSenha = false;
    this.cdr.markForCheck();
  }

  onSalvarNovaSenha(): void {
    if (!this.usuarioSenhaAlvo?.idUsuario) {
      return;
    }
    this.erroApiSenha = null;
    if (this.formSenha.invalid) {
      this.formSenha.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    if (this.formSenha.errors?.['mismatch'] || this.formSenha.errors?.['igualAtual']) {
      this.formSenha.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const { senhaAtual, senhaNova } = this.formSenha.getRawValue();
    this.salvandoSenha = true;
    this.cdr.markForCheck();
    this.usuarioService
      .alterarSenha(this.usuarioSenhaAlvo.idUsuario, { senhaAtual, senhaNova })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.salvandoSenha = false;
          this.showModalAlterarSenha = false;
          this.usuarioSenhaAlvo = null;
          this.formSenha.reset();
          this.dialogTitulo = 'Senha alterada';
          this.dialogMensagem =
            typeof res?.message === 'string' && res.message.trim()
              ? res.message.trim()
              : 'A senha foi atualizada com sucesso.';
          this.dialogTipo = 'info';
          this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.salvandoSenha = false;
          const msg = extrairMensagemErroApi(err, 'Não foi possível alterar a senha.');
          if (err.status === 403) {
            this.showModalAlterarSenha = false;
            this.usuarioSenhaAlvo = null;
            this.formSenha.reset();
            this.dialogTitulo = 'Erro';
            this.dialogMensagem = msg;
            this.dialogTipo = 'erro';
            this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
            this.dialogCallback = null;
            this.dialogVisivel = true;
          } else {
            this.erroApiSenha = msg;
          }
          this.cdr.markForCheck();
        },
      });
  }

  onExcluirUsuario(usuario: Usuario, event: MouseEvent): void {
    event.stopPropagation();
    this.fecharMenuAcaoLinha();
    if (!usuario.idUsuario) {
      return;
    }
    const atual = this.authService.getCurrentUser();
    if (atual?.idUsuario === usuario.idUsuario) {
      this.dialogTitulo = 'Ação não permitida';
      this.dialogMensagem =
        'Administradores não podem excluir a própria conta. Utilize outra conta de administrador para realizar esta operação.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }
    this.dialogTitulo = 'Confirmar exclusão';
    this.dialogMensagem = `Deseja realmente excluir o usuário "${usuario.nomeUsuario}" (${usuario.emailUsuario})? Esta ação não pode ser desfeita.`;
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'perigo' },
    ];
    this.dialogCallback = () => this.executarExclusao(usuario.idUsuario);
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  private executarExclusao(idUsuario: string): void {
    this.usuarioService
      .deletar(idUsuario)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.carregar();
        },
        error: (err: { error?: { message?: string } }) => {
          this.dialogTitulo = 'Erro ao excluir';
          this.dialogMensagem = err?.error?.message ?? 'Não foi possível excluir o usuário.';
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
    this.cdr.markForCheck();
  }

  perfilLabel(perfil: UserRole): string {
    return ROLE_LABELS[perfil] ?? String(perfil ?? '—');
  }

  indiceGlobal(pageRow: number): number {
    return (this.paginaAtual - 1) * this.itensPorPagina + pageRow;
  }

  trackUsuario(index: number, u: Usuario): string {
    const id = u.idUsuario?.trim();
    if (id) return id;
    const em = u.emailUsuario?.trim();
    if (em) return em;
    return `row-${index}`;
  }

  statusLabel(ativo: boolean): string {
    return ativo ? 'Ativo' : 'Inativo';
  }

  fecharModalCadastro(): void {
    this.showModalCadastro = false;
    this.cdr.markForCheck();
  }

  onUsuarioCadastrado(): void {
    this.showModalCadastro = false;
    this.cdr.markForCheck();
    this.carregar();
  }
}
