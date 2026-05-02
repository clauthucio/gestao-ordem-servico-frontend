import { Component, OnInit, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { UsuarioService } from '../../core/http/usuario.service';
import { UserRole, ROLE_LABELS } from '../../core/enums/roles.enum';
import { gerarSenhaTemporaria } from '../../core/utils/senha-temporaria';

export type StatusUsuarioCadastro = 'ATIVO' | 'INATIVO';

/** Domínio fixo para e-mails corporativos PIM. */
export const EMAIL_DOMINIO_PIM = '@pim.com';

@Component({
  selector: 'app-cadastro-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogComponent],
  templateUrl: './cadastro-usuario.html',
})
export class CadastroUsuario implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  /** Quando true, o componente está dentro de `ModalContainer` (lista de usuários); emite eventos em vez de navegar. */
  dentroModal = input(false);

  salvo = output<void>();
  cancelado = output<void>();

  readonly perfilOpcoes: { value: UserRole; label: string }[] = [
    { value: UserRole.ADMIN, label: ROLE_LABELS[UserRole.ADMIN] },
    { value: UserRole.TECNICO, label: ROLE_LABELS[UserRole.TECNICO] },
    { value: UserRole.SOLICITANTE, label: ROLE_LABELS[UserRole.SOLICITANTE] },
    { value: UserRole.SUPERVISOR_DE_MANUTENCAO, label: ROLE_LABELS[UserRole.SUPERVISOR_DE_MANUTENCAO] },
  ];

  readonly statusOpcoes: { value: StatusUsuarioCadastro; label: string }[] = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
  ];

  readonly emailDominio = EMAIL_DOMINIO_PIM;

  /** E-mails já cadastrados (normalizados), para validação antes do POST. */
  private emailsExistentes = new Set<string>();

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    emailLocal: [
      '',
      [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+$/), Validators.maxLength(64)],
    ],
    perfil: ['' as UserRole | '', [Validators.required]],
    status: ['' as StatusUsuarioCadastro | '', [Validators.required]],
  });

  salvando = false;
  erroApi: string | null = null;
  carregandoEmails = true;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];

  ngOnInit(): void {
    this.usuarioService
      .listar()
      .pipe(take(1))
      .subscribe({
        next: (lista) => {
          this.emailsExistentes.clear();
          lista.forEach((u) => this.emailsExistentes.add(u.emailUsuario.toLowerCase().trim()));
          this.carregandoEmails = false;
          // #region agent log
          fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:listar_next',message:'listar_ok',data:{count:lista.length,carregandoEmails:this.carregandoEmails},timestamp:Date.now(),hypothesisId:'H3',runId:'pre-fix'})}).catch(()=>{});
          // #endregion
        },
        error: () => {
          this.carregandoEmails = false;
          // #region agent log
          fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:listar_error',message:'listar_fail',data:{carregandoEmails:this.carregandoEmails},timestamp:Date.now(),hypothesisId:'H3',runId:'pre-fix'})}).catch(()=>{});
          // #endregion
        },
      });
  }

  montarEmailCompleto(): string {
    return `${this.form.controls.emailLocal.value.trim().toLowerCase()}${EMAIL_DOMINIO_PIM}`;
  }

  /** Monta texto a partir de `details` do `AppError` (Zod flatten) retornado pelo backend. */
  private formatZodFieldErrorsFromBody(body: unknown): string {
    if (!body || typeof body !== 'object' || !('details' in body)) {
      return '';
    }
    const details = (body as { details: unknown }).details;
    if (!details || typeof details !== 'object') {
      return '';
    }
    const fieldErrors = (details as { fieldErrors?: Record<string, unknown> }).fieldErrors;
    if (!fieldErrors || typeof fieldErrors !== 'object') {
      return '';
    }
    return Object.entries(fieldErrors)
      .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}: ${String(x)}`) : []))
      .join('; ');
  }

  onCadastrar(): void {
    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:onCadastrar_entry',message:'submit',data:{salvando:this.salvando,carregandoEmails:this.carregandoEmails,invalid:this.form.invalid},timestamp:Date.now(),hypothesisId:'H4',runId:'pre-fix'})}).catch(()=>{});
    // #endregion
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const emailCompleto = this.montarEmailCompleto();
    if (this.emailsExistentes.has(emailCompleto)) {
      this.form.controls.emailLocal.setErrors({ duplicado: true });
      this.form.controls.emailLocal.markAsTouched();
      return;
    }

    this.erroApi = null;
    this.salvando = true;

    const senhaTemporaria = gerarSenhaTemporaria(8);
    const raw = this.form.getRawValue();
    const payload = {
      nome: raw.nome.trim(),
      email: emailCompleto,
      perfil: raw.perfil,
      status: raw.status,
      senhaTemporaria,
    };
    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:before_post',message:'cadastrar_payload_shape',data:{keys:Object.keys(payload),perfil:payload.perfil,status:payload.status,emailLen:payload.email.length,senhaLen:payload.senhaTemporaria.length,nomeLen:payload.nome.length},timestamp:Date.now(),hypothesisId:'H1',runId:'pre-fix'})}).catch(()=>{});
    // #endregion

    this.usuarioService
      .cadastrar(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          // #region agent log
          fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:cadastrar_next',message:'post_ok',data:{salvando:this.salvando},timestamp:Date.now(),hypothesisId:'H2',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          this.emailsExistentes.add(emailCompleto);
          this.form.reset();
          this.salvando = false;
          this.dialogTitulo = 'Usuário cadastrado';
          this.dialogMensagem = `O usuário foi cadastrado com sucesso. Uma senha temporária foi enviada para o e-mail ${emailCompleto}. O usuário deverá alterar a senha no primeiro acesso.`;
          this.dialogTipo = 'info';
          this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
          this.dialogVisivel = true;
        },
        error: (err: HttpErrorResponse) => {
          const status = err?.status;
          const body = err?.error;
          const msg =
            typeof body === 'object' && body !== null && 'message' in body
              ? String((body as { message?: unknown }).message ?? '')
              : typeof body === 'string'
                ? body
                : '';
          // #region agent log
          fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:cadastrar_error',message:'post_fail',data:{status,bodyType:typeof body,msgSnippet:msg.slice(0,120),bodyPreview:typeof body==='string'?body.slice(0,240):(body&&typeof body==='object'?JSON.stringify(body).slice(0,320):''),salvandoBeforeClear:this.salvando},timestamp:Date.now(),hypothesisId:'H1',runId:'pre-fix'})}).catch(()=>{});
          // #endregion
          if (status === 409 || (typeof msg === 'string' && /e-?mail|email|duplicad|já existe|cadastrado/i.test(msg))) {
            this.erroApi = msg || 'Este e-mail já está cadastrado no sistema.';
            this.form.controls.emailLocal.setErrors({ duplicado: true });
          } else {
            const zodExtra = this.formatZodFieldErrorsFromBody(body);
            this.erroApi =
              [msg, zodExtra].filter((s) => s.length > 0).join(' ').trim() ||
              'Não foi possível cadastrar o usuário. Tente novamente.';
          }
          this.salvando = false;
          // #region agent log
          fetch('http://127.0.0.1:7317/ingest/a62d4b2b-ea8d-4391-b0fa-1b7a4d9fed7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'319ff8'},body:JSON.stringify({sessionId:'319ff8',location:'cadastro-usuario.ts:after_error_handler',message:'salvando_cleared',data:{salvando:this.salvando,erroApiLen:(this.erroApi??'').length},timestamp:Date.now(),hypothesisId:'H2',runId:'pre-fix'})}).catch(()=>{});
          // #endregion
        },
      });
  }

  onDialogAcao(acao: string): void {
    this.dialogVisivel = false;
    if (acao === 'ok') {
      if (this.dentroModal()) {
        this.salvo.emit();
      } else {
        void this.router.navigate(['/app/usuarios']);
      }
    }
  }

  onCancelar(): void {
    this.form.reset();
    this.erroApi = null;
    this.dialogVisivel = false;
    if (this.dentroModal()) {
      this.cancelado.emit();
    } else {
      void this.router.navigate(['/app/usuarios']);
    }
  }

  /** Limpa erro de duplicidade ao editar o identificador de e-mail. */
  onEmailLocalInput(): void {
    this.erroApi = null;
    const c = this.form.controls.emailLocal;
    const errs = c.errors;
    if (errs?.['duplicado']) {
      const { duplicado: _d, ...rest } = errs;
      c.setErrors(Object.keys(rest).length ? rest : null);
    }
  }
}
