import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UnsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { UserRole } from './core/enums/roles.enum';

export const routes: Routes = [
  // PÚBLICAS  - sem autenticação)

  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (m) => m.Login
          ),
      },
      // Outras rotas de auth (registro, reset, etc) aqui
    ],
  },

  //PROTEGIDAS POR AUTENTICAÇÃO

  {
    path: 'app',
    canActivate: [AuthGuard], // Todas as rotas /app/* precisam de token
    children: [

      //DASHBOARD
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(
            (m) => m.Dashboard
          ),
      },

      //ORDENS DE SERVIÇO
      {
        path: 'ordens',
        children: [
          // Listar
          {
            path: '',
            loadComponent: () =>
              import('./features/os-list/os-list').then(
                (m) => m.OsList
              ),
          },

          // Criar nova OS
          {
            path: 'nova',
            canActivate: [RoleGuard],
            data: { requiredRole: UserRole.SOLICITANTE },
            canDeactivate: [UnsavedChangesGuard],
            loadComponent: () =>
              import('./features/nova-os/nova-os').then(
                (m) => m.NovaOs
              ),
          },

          // Detalhe da OS
          {
            path: ':id',
            loadComponent: () =>
              import('./features/os-detail/os-detail').then(
                (m) => m.OsDetail
              ),
          },

          // Atualizar status da OS  - rota separada para técnico
          {
            path: ':id/atualizar',
            canActivate: [RoleGuard],
            data: { requiredRole: UserRole.TECNICO },
            loadComponent: () =>
              import('./features/atualiza-os/atualiza-os').then(
                (m) => m.AtualizaOs
              ),
          },
        ],
      },

      //EQUIPAMENTOS
      {
        path: 'equipamentos',
        canActivate: [RoleGuard],
        data: { requiredRole: UserRole.ADMIN },
        children: [
          // Listar
          {
            path: '',
            loadComponent: () =>
              import('./features/equipamentos/equipamentos').then(
                (m) => m.Equipamentos
              ),
          },

          // Cadastro/Edição
          {
            path: 'novo',
            canDeactivate: [UnsavedChangesGuard],
            loadComponent: () =>
              import('./features/cadastro-equipamentos/cadastro-equipamentos').then(
                (m) => m.CadastroEquipamento
              ),
          },

          {
            path: ':id/editar',
            canDeactivate: [UnsavedChangesGuard],
            loadComponent: () =>
              import('./features/cadastro-equipamentos/cadastro-equipamentos').then(
                (m) => m.CadastroEquipamento
              ),
          },
        ],
      },

      //RELATÓRIOS
      {
        path: 'relatorios',
        canActivate: [RoleGuard],
        data: { requiredRole: UserRole.SUPERVISOR_DE_MANUTENCAO },
        children: [
          {
            path: 'tecnicos',
            loadComponent: () =>
              import('./features/relatorios-os/relatorios-os').then(
                (m) => m.RelatoriosOs
              ),
          },
        ],
      },
    ],
  },

  //FALLBACK
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
