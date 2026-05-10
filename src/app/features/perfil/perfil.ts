import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { mapBrutoParaUsuario } from '../../core/http/usuario-api-normalize';
import { UsuarioService } from '../../core/http/usuario.service';
import { User } from '../../core/models/auth.model';
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

function extrairCorpoUsuarioPut(body: unknown): unknown {
  const o =
    body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  if ('dados' in o && o['dados'] != null) return o['dados'];
  if ('data' in o && o['data'] != null) return o['data'];
  return body;
}

function usuarioParaSessao(u: Usuario): User {
  return {
    idUsuario: u.idUsuario,
    nomeUsuario: u.nomeUsuario,
    emailUsuario: u.emailUsuario,
    perfilUsuario: u.perfilUsuario,
    statusUsuario: u.statusUsuario,
  };
}

const senhaControleValidators = [
  Validators.required,
  Validators.minLength(SENHA_ALTERACAO_MIN),
  Validators.maxLength(SENHA_ALTERACAO_MAX),
];

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalContainerComponent,
    DialogComponent,
  ],
  templateUrl: './perfil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  readonly UserRole = UserRole;
  readonly ROLE_LABELS = ROLE_LABELS;

  usuario: User | null = null;

  readonly formPerfil = this.fb.nonNullable.group({
    nomeUsuario: ['', [Validators.required, Validators.minLength(2)]],
    emailUsuario: ['', [Validators.required, Validators.email]],
  });

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

  salvandoPerfil = false;
  showModalSenha = false;
  salvandoSenha = false;
  erroApiSenha: string | null = null;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];

  get isAdmin(): boolean {
    return this.usuario?.perfilUsuario === UserRole.ADMIN;
  }

  get perfilLabel(): string {
    if (!this.usuario) return '';
    return ROLE_LABELS[this.usuario.perfilUsuario] ?? this.usuario.perfilUsuario;
  }

  ngOnInit(): void {
    const u = this.authService.getCurrentUser();
    if (!u?.idUsuario) {
      void this.router.navigate(['/auth/login']);
      return;
    }
    this.usuario = u;
    this.formPerfil.patchValue({
      nomeUsuario: u.nomeUsuario,
      emailUsuario: u.emailUsuario,
    });
    if (!this.isAdmin) {
      this.formPerfil.controls.emailUsuario.clearValidators();
      this.formPerfil.controls.emailUsuario.updateValueAndValidity({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  onSalvarPerfil(): void {
    if (!this.usuario?.idUsuario) return;
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const { nomeUsuario, emailUsuario } = this.formPerfil.getRawValue();
    const body: { nomeUsuario: string; emailUsuario?: string } = { nomeUsuario };
    if (this.isAdmin) {
      body.emailUsuario = emailUsuario;
    }
    this.salvandoPerfil = true;
    this.cdr.markForCheck();
    this.usuarioService
      .atualizar(this.usuario.idUsuario, body)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const atualizado = mapBrutoParaUsuario(extrairCorpoUsuarioPut(res));
          const sessao = usuarioParaSessao(atualizado);
          this.authService.syncCurrentUserFromServer(sessao);
          this.usuario = sessao;
          this.formPerfil.patchValue({
            nomeUsuario: sessao.nomeUsuario,
            emailUsuario: sessao.emailUsuario,
          });
          this.salvandoPerfil = false;
          this.abrirDialogInfo('Dados salvos', 'Suas informações foram atualizadas com sucesso.');
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.salvandoPerfil = false;
          this.abrirDialogErro(
            'Erro',
            extrairMensagemErroApi(err, 'Não foi possível salvar as alterações.'),
          );
          this.cdr.markForCheck();
        },
      });
  }

  abrirModalSenha(): void {
    this.erroApiSenha = null;
    this.formSenha.reset();
    this.showModalSenha = true;
    this.cdr.markForCheck();
  }

  fecharModalSenha(): void {
    this.showModalSenha = false;
    this.erroApiSenha = null;
    this.formSenha.reset();
    this.salvandoSenha = false;
    this.cdr.markForCheck();
  }

  onSalvarNovaSenha(): void {
    if (!this.usuario?.idUsuario) return;
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
      .alterarSenha(this.usuario.idUsuario, { senhaAtual, senhaNova })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.salvandoSenha = false;
          this.showModalSenha = false;
          this.formSenha.reset();
          const msg =
            typeof res?.message === 'string' && res.message.trim()
              ? res.message.trim()
              : 'Sua senha foi atualizada com sucesso.';
          this.abrirDialogInfo('Senha alterada', msg);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.salvandoSenha = false;
          const msg = extrairMensagemErroApi(err, 'Não foi possível alterar a senha.');
          if (err.status === 403) {
            this.showModalSenha = false;
            this.formSenha.reset();
            this.abrirDialogErro('Erro', msg);
          } else {
            this.erroApiSenha = msg;
          }
          this.cdr.markForCheck();
        },
      });
  }

  onDialogAcao(acao: string): void {
    if (acao === 'ok') {
      this.dialogVisivel = false;
      this.cdr.markForCheck();
    }
  }

  private abrirDialogInfo(titulo: string, mensagem: string): void {
    this.dialogTitulo = titulo;
    this.dialogMensagem = mensagem;
    this.dialogTipo = 'info';
    this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
    this.dialogVisivel = true;
  }

  private abrirDialogErro(titulo: string, mensagem: string): void {
    this.dialogTitulo = titulo;
    this.dialogMensagem = mensagem;
    this.dialogTipo = 'erro';
    this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
    this.dialogVisivel = true;
  }
}
