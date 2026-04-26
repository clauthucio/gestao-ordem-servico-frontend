//Protege contra perda de dados

import { Injectable, inject } from '@angular/core';
import {
  CanDeactivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';

 //Interface que um componente deve implementar para usar este guard
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

@Injectable({
  providedIn: 'root',
})
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  //canDeactivate é chamado quando user tenta sair da rota
  canDeactivate(
    component: CanComponentDeactivate
  ): boolean | Promise<boolean> {
    // Se componente tem método canDeactivate, chamar
    if (component.canDeactivate) {
      return component.canDeactivate();
    }

    // Senão, permite sair
    return true;
  }
}
