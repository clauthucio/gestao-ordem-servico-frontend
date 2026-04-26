 //Registra todos os providers (serviços, interceptors, guards)

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Routing: definir as rotas
    provideRouter(routes),
    // 2. HTTP Client - Requisições HTTP
    provideHttpClient(),
    // 3. Registrar Auth Interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true, // multi: true permite múltiplos interceptors
    },
    // 4. Animações (Angular Material precisa disso)
    provideAnimations(),
  ],
};
