//Formulário de autenticação com Reactive Forms - Validação em tempo real + feedback visual

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form reativo
  loginForm!: FormGroup;

  // Estados
  loading = false;
  errorMessage: string | null = null;

  // Cleanup
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Criar formulário com validações
    this.loginForm = this.fb.group({
      emailUsuario: ['', [Validators.required, Validators.email]],
      senhaUsuario: ['', [Validators.required, Validators.minLength(6)]],
    });
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

    // DEBUG: Ver o form e os valores
    console.log('📋 FormGroup valor completo:', this.loginForm.value);
    console.log('📋 FormGroup raw:', this.loginForm.getRawValue());
    console.log('📋 Email:', this.loginForm.get('email')?.value);
    console.log('📋 Password:', this.loginForm.get('password')?.value);


    // Obter valores do form
    const { emailUsuario, senhaUsuario } = this.loginForm.value;

    // Chamar AuthService
    this.authService.login(emailUsuario, senhaUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        // Sucesso
        next: (response) => {
          console.log('Login realizado com sucesso!', response);
          // Redirecionar para dashboard
          this.router.navigate(['/app/dashboard']);
        },

        // Erro
        error: (error) => {
          console.error('Erro no login:', error);
          this.loading = false;

          // Mensagem de erro do backend ou genérica
          this.errorMessage = error?.error?.mensagem || 'Email ou senha inválidos';
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
