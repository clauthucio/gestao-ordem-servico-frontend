import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
    <nav class="bg-primary text-on-primary px-8 py-4 shadow-md">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <!-- Logo/Titulo -->
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-3xl">maintenance</span>
          <h1 class="text-xl font-bold">Gestão OS</h1>
        </div>

        <!-- Menu (muda conforme role) -->
        @if (currentUser) {
          <div class="flex items-center gap-8">
            <!-- Links do menu -->
            <div class="flex gap-6">
              <a
                routerLink="/app/dashboard"
                class="hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <span class="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </a>

              <!-- TODOS veem Ordens -->
              <a
                routerLink="/app/ordens"
                class="hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <span class="material-symbols-outlined">assignment</span>
                <span>Ordens de Serviço</span>
              </a>

              <!-- SUPERVISOR+ veem Equipamentos -->
              @if (hasRole(UserRole.SUPERVISOR_DE_MANUTENCAO) || hasRole(UserRole.ADMIN)) {
                <a
                  routerLink="/app/equipamentos"
                  class="hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <span class="material-symbols-outlined">precision_manufacturing</span>
                  <span>Equipamentos</span>
                </a>
              }

              <!-- SUPERVISOR+ veem Relatórios -->
              @if (hasRole(UserRole.SUPERVISOR_DE_MANUTENCAO) || hasRole(UserRole.ADMIN)) {
                <a
                  routerLink="/app/relatorios/tecnicos"
                  class="hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <span class="material-symbols-outlined">bar_chart</span>
                  <span>Relatórios</span>
                </a>
              }
            </div>

            <!-- User Profile (dropdown) -->
            <div class="flex items-center gap-4 pl-6 border-l border-on-primary/30">
              <div>
                <p class="text-sm font-bold">{{ currentUser.nomeUsuario }}</p>
                <p class="text-xs opacity-75">
                  {{ getRoleLabel(currentUser.perfilUsuario) }}
                </p>
              </div>

              <!-- Dropdown Menu -->
              <div class="relative group">
                <button
                  class="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center hover:bg-on-primary/30 transition-colors"
                >
                  <span class="material-symbols-outlined">account_circle</span>
                </button>

                <!-- Menu Dropdown -->
                <div
                  class="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                >
                  <a
                    href="#"
                    class="block px-4 py-2 text-on-surface hover:bg-surface-container transition-colors text-sm first:rounded-t-lg"
                  >
                    <span class="material-symbols-outlined text-sm align-text-bottom">
                      person
                    </span>
                    Perfil
                  </a>
                  <a
                    href="#"
                    class="block px-4 py-2 text-on-surface hover:bg-surface-container transition-colors text-sm"
                  >
                    <span class="material-symbols-outlined text-sm align-text-bottom">
                      settings
                    </span>
                    Configurações
                  </a>
                  <button
                    (click)="onLogout()"
                    class="w-full text-left px-4 py-2 text-error hover:bg-error/10 transition-colors text-sm last:rounded-b-lg"
                  >
                    <span class="material-symbols-outlined text-sm align-text-bottom">
                      logout
                    </span>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="text-sm text-on-primary/70">Não logado</div>
        }
      </div>
    </nav>
  `,
  styles: [],
})
export class NavbarComponent implements OnInit, OnDestroy {
  // 👇 ADICIONE ESTA LINHA - expõe o enum para o template
  UserRole = UserRole;

  // Injetar serviços
  private authService = inject(AuthService);
  private router = inject(Router);

  // Usuário atual
  currentUser: User | null = null;

  // Cleanup
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Se user estava logado antes, carrega
    this.currentUser = this.authService.getCurrentUser();

    // Quando user muda (login/logout), atualizar navbar
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

  /**
   * Verificar se user tem um role específico
   */
  hasRole(role: UserRole | UserRole[]): boolean {
    return this.authService.hasRole(role);
  }

  /**
   * Obter label do role em português
   */
  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  /**
   * Fazer logout
   */
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
