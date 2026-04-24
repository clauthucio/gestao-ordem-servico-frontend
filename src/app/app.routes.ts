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

  /* 💡 Descomente os blocos abaixo conforme for criando os arquivos de rotas para cada pasta:
  {
    path: 'cotacoes',
    loadChildren: () => import('./features/cotacoes/cotacoes.routes').then(m => m.cotacoesRoutes)
  },
  {
    path: 'requisicoes',
    loadChildren: () => import('./features/requisicoes/requisicoes.routes').then(m => m.requisicoesRoutes)
  },
  {
    path: 'setores',
    loadChildren: () => import('./features/setores/setores.routes').then(m => m.setoresRoutes)
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./features/usuarios/usuarios.routes').then(m => m.usuariosRoutes)
  },
  */
  {
    path: '**',
    redirectTo: 'auth'
  }
];