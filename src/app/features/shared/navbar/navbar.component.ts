import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.model';
import { UserRole, ROLE_LABELS } from '../../../core/enums/roles.enum';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Sidebar -->
    <aside class="w-64 bg-primary text-on-primary p-6 flex flex-col shadow-lg min-h-screen">

      <!-- Logo Section -->
      <div class="flex items-center gap-3 mb-12">
        <span class="material-symbols-outlined text-2xl">SMART OS</span>
        <div>
          <h1 class="text-base font-bold leading-tight">Industrial</h1>
          <p class="text-xs opacity-75">PIM</p>
        </div>
      </div>

      <!-- Navigation Menu -->
      @if (currentUser) {
        <nav class="flex-1 space-y-2">
          <!-- Dashboard -->
          <a
            routerLink="/app/dashboard"
            routerLinkActive="bg-on-primary/20"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-on-primary/10 transition-all text-sm"
          >
            <span class="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </a>

          <!-- Ordens de Serviço -->
          <a
            routerLink="/app/ordens"
            routerLinkActive="bg-on-primary/20"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-on-primary/10 transition-all text-sm"
          >
            <span class="material-symbols-outlined">assignment</span>
            <span>Ordens</span>
          </a>

          <!-- Equipamentos (SUPERVISOR+) -->
          @if (hasRole(UserRole.SUPERVISOR_DE_MANUTENCAO) || hasRole(UserRole.ADMIN)) {
            <a
              routerLink="/app/equipamentos"
              routerLinkActive="bg-on-primary/20"
              class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-on-primary/10 transition-all text-sm"
            >
              <span class="material-symbols-outlined">precision_manufacturing</span>
              <span>Equipamentos</span>
            </a>
          }

          <!-- Relatórios (SUPERVISOR+) -->
          @if (hasRole(UserRole.SUPERVISOR_DE_MANUTENCAO) || hasRole(UserRole.ADMIN)) {
            <a
              routerLink="/app/relatorios/tecnicos"
              routerLinkActive="bg-on-primary/20"
              class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-on-primary/10 transition-all text-sm"
            >
              <span class="material-symbols-outlined">bar_chart</span>
              <span>Relatórios</span>
            </a>
          }
        </nav>

        <!-- User Section (Bottom) -->
        <div class="border-t border-on-primary/30 pt-4">
          <!-- User Info -->
          <div class="px-4 py-3 bg-on-primary/10 rounded-lg mb-4">
            <p class="font-bold text-sm truncate">{{ currentUser.nomeUsuario }}</p>
            <p class="text-xs opacity-75 truncate">
              {{ getRoleLabel(currentUser.perfilUsuario) }}
            </p>
          </div>

          <!-- Dropdown Menu -->
          <div class="relative group">
            <button
              class="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-on-primary/10 transition-all text-sm"
            >
              <span class="material-symbols-outlined text-base">account_circle</span>
              <span class="material-symbols-outlined text-xs">expand_more</span>
            </button>

            <!-- Dropdown Items -->
            <div
              class="absolute bottom-full left-0 w-full mb-2 bg-surface rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
            >
              <a
                href="#"
                class="flex items-center gap-2 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors text-sm first:rounded-t-lg"
              >
                <span class="material-symbols-outlined text-sm">person</span>
                <span>Perfil</span>
              </a>
              <a
                href="#"
                class="flex items-center gap-2 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors text-sm"
              >
                <span class="material-symbols-outlined text-sm">settings</span>
                <span>Configurações</span>
              </a>
              <button
                (click)="onLogout()"
                class="w-full flex items-center gap-2 px-4 py-2 text-error hover:bg-error/10 transition-colors text-sm last:rounded-b-lg"
              >
                <span class="material-symbols-outlined text-sm">logout</span>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      } @else {
        <div class="text-sm text-on-primary/70 text-center">Não logado</div>
      }
    </aside>
  `,
  styles: [],
})
export class NavbarComponent implements OnInit, OnDestroy {
  UserRole = UserRole;

  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        console.log('Navbar atualizada pelo usuário:', user);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    return this.authService.hasRole(role);
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout realizado com sucesso!');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Erro no logout:', err);
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
