import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- Necessário para o ngModel e ngForm
import { AuthService } from '../services/authService';
@Component({
  selector: 'app-login', // O seletor pode variar dependendo de como você gerou o componente
  standalone: true,
  imports: [FormsModule], // <-- Importando o módulo de formulários aqui
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class Login {
  emailUsuario = '';
  senhaUsuario = '';

  // Injeta o AuthService para usar seus métodos
  constructor(private authService: AuthService) {}

  // Signals para o controle de estado, correspondendo a error() e loading() no HTML
  error = signal<string | null>(null);
  loading = signal<boolean>(false);

  // Método acionado pelo (ngSubmit) do formulário
  onSubmit() {
    // Exemplo de validação simples
    if (!this.emailUsuario || !this.senhaUsuario) {
      this.error.set('E-mail e senha são obrigatórios.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    // Chama o AuthService.login()
    this.authService.login(this.emailUsuario, this.senhaUsuario).subscribe({
      // Quando login é bem sucedido (next)
      next: (response) => {
        this.loading.set(false);
        console.log('Login com sucesso!', response);
        // AQUI SERÁ IMPLEMENTADO TELA DE HOME
        // this.router.navigate(['/home']);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error.error?.mensagem || 'Erro ao fazer login');
      }
    });
  }
}
