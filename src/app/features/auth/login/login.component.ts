//Formulário de autenticação com Reactive Forms - Validação em tempo real + feedback visual

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {
  // Injetar serviços
  private readonly fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Sempre definido antes da primeira renderização (evita NG01052 se redirecionar utilizador já logado). */
  loginForm: FormGroup = this.fb.group({
    emailUsuario: ['', [Validators.required, Validators.email]],
    senhaUsuario: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Estados
  loading = false;
  errorMessage: string | null = null;
  /** Alterna visibilidade do campo senha (botão “ver senha”). */
  mostrarSenha = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('sessao') === 'expirada') {
      this.errorMessage = 'Sua sessão expirou ou o acesso não foi autorizado. Faça login novamente.';
    }
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(['/app/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get emailUsuario() {
    return this.loginForm.get('emailUsuario');
  }

  get senhaUsuario() {
    return this.loginForm.get('senhaUsuario');
  }

  hasError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    if (field.hasError('required')) {
      return `${this.getLabelField(fieldName)} é obrigatório`;
    }

    if (field.hasError('email')) {
      return 'Email inválido';
    }

    if (field.hasError('minlength')) {
      return `${this.getLabelField(fieldName)} deve ter no mínimo 6 caracteres`;
    }

    return 'Campo inválido';
  }

  private getLabelField(fieldName: string): string {
    const labels: Record<string, string> = {
      emailUsuario: 'E-mail',
      senhaUsuario: 'Senha',
    };
    return labels[fieldName] || fieldName;
  }

  onSubmit(): void {
    // Se o formulário não é válido, não deixa enviar
    if (this.loginForm.invalid) {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    // Obter valores do form
    const { emailUsuario, senhaUsuario } = this.loginForm.value;

    // Chamar AuthService
    this.authService.login(emailUsuario, senhaUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        // Sucesso
        next: (response) => {
          this.loading = false;
          void this.router.navigate(['/app/dashboard']);
        },

        // Erro
        error: (error: { status?: number; error?: { message?: string; mensagem?: string } }) => {
          this.loading = false;

          const body = error?.error;
          const fromApi =
            (typeof body?.message === 'string' && body.message) ||
            (typeof body?.mensagem === 'string' && body.mensagem) ||
            '';

          if (error?.status === 403 && fromApi) {
            this.errorMessage = fromApi;
            return;
          }

          this.errorMessage = fromApi || 'E-mail ou senha inválidos.';
        },

        // Completo
        complete: () => {
          this.loading = false;
        },
      });
  }

  get isSubmitDisabled(): boolean {
    return this.loginForm.invalid || this.loading;
  }
}
