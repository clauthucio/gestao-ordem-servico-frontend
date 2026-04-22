import { Routes } from '@angular/router';
import { Login } from './login/login';
// O "../" serve para sair da pasta 'auth' e entrar em 'dashboard'
import { Dashboard } from '../dashboard/dashboard'; 
import { OsDetail } from '../os-detail/os-detail';
import { Equipamentos } from '../equipamentos/equipamentos';

export const authRoutes: Routes = [
  {
    path: '',
    component: Login
  },
  {
    path: 'dashboard', 
    component: Dashboard
  },
  {
    path: 'os-detail', 
    component: OsDetail
  },
  {
    path: 'equipamentos', 
    component: Equipamentos
  }
];