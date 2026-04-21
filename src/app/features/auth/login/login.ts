import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- Necessário para o ngModel e ngForm

@Component({
  selector: 'app-login', // O seletor pode variar dependendo de como você gerou o componente
  standalone: true,
  imports: [FormsModule], // <-- Importando o módulo de formulários aqui
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // Propriedades vinculadas aos inputs pelo [(ngModel)]
  email = '';
  password = '';

  // Signals para o controle de estado, correspondendo a error() e loading() no HTML
  error = signal<string | null>(null);
  loading = signal<boolean>(false);

  // Método acionado pelo (ngSubmit) do formulário
  onSubmit() {
    // Exemplo de validação simples
    if (!this.email || !this.password) {
      this.error.set('Por favor, preencha todos os campos.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    // Aqui entrará a integração com o seu serviço de autenticação (ex: AuthService)
    // Abaixo há apenas uma simulação (setTimeout) para ver o botão "Entrando..." funcionando
    setTimeout(() => {
      this.loading.set(false);
      console.log('Tentativa de login efetuada:', this.email);
    }, 2000);
  }
}
