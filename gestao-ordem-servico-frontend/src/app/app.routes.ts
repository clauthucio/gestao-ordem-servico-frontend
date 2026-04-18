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
    loadChildren: () => import('./features/login/auth/auth.routes').then(m => m.authRoutes)
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