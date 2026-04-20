import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './top-bar.html'
})
export class TopNav {
  pageTitle = input('Painel Operacional');
  user = input<UserProfile>({
    name: 'Carlos Silva',
    role: 'Supervisor de Manutenção',
    avatarUrl: ''
  });
  searchQuery = input('');
  
  searchChange = output<string>();
  menuClick = output<void>();
  notificationClick = output<void>();
  profileClick = output<void>();
}