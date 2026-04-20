import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNav } from './components/side-nav/side-nav';
import { TopNav } from './components/top-bar/top-bar';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SideNav, TopNav],
  template: `
    <app-side-nav [items]="navItems" />
    <app-top-nav 
      [pageTitle]="pageTitle"
      [user]="currentUser"
      (menuClick)="onMenuClick()"
      (searchChange)="onSearch($event)"
    />
    <main class="ml-64 pt-24 px-8 pb-12 min-h-screen bg-background text-on-surface antialiased">
      <div class="container">
        <router-outlet />
      </div>
    </main>
  `
})
export class AppComponent {
  pageTitle = 'Painel Operacional';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/' },
    { label: 'Lista de OS', icon: 'assignment', route: '/os' },
    { label: 'Nova OS', icon: 'add_box', route: '/os/nova' },
    { label: 'Equipamentos', icon: 'precision_manufacturing', route: '/equipamentos' },
    { label: 'Relatórios', icon: 'analytics', route: '/relatorios' },
    { label: 'Configurações', icon: 'settings', route: '/configuracoes' }
  ];

  currentUser: UserProfile = {
    name: 'Carlos Silva',
    role: 'Supervisor de Manutenção',
    avatarUrl: 'assets/avatar.jpg'
  };

  onMenuClick(): void {
    // Toggle sidebar em mobile futuramente
  }

  onSearch(query: string): void {
    console.log('Buscar:', query);
  }
}