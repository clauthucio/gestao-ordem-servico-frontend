import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    // Feature de Autenticação (Carregada via Lazy Loading)
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },

  // Rota do Dashboard (Pasta separada)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
  },

  // Rota do Detalhe da OS (Pasta separada)
  {
    path: 'os-detail',
    loadComponent: () => import('./features/os-detail/os-detail').then(m => m.OsDetail)
  },
  {
    path: 'equipamentos',
    loadComponent: () => import('./features/equipamentos/equipamentos').then(m => m.Equipamentos)
  },
  {
    path: 'nova-os',
    loadComponent: () => import('./features/nova-os/nova-os').then(m => m.NovaOs)
  },
  {
    path: 'atualiza-os',
    loadComponent: () => import('./features/atualiza-os/atualiza-os').then(m => m.AtualizaOs)
  },
  {
    path: 'relatorios-os',
    loadComponent: () => import('./features/relatorios-os/relatorios-os').then(m => m.RelatoriosOs)
  },
  {
    path:'cadastro-equipamento',
    loadComponent: () => import('./features/cadastro-equipamentos/cadastro-equipamentos').then(m => m.CadastroEquipamento)
  },
  {
    path:'os-list',
    loadComponent: () => import('./features/os-list/os-list').then(m => m.OsList)
  },

  {
    path: '**',
    redirectTo: 'auth'
  }
];