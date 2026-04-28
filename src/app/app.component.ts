import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './features/shared/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (authService.isAuthenticated()) {
      <div class="flex h-screen w-screen">
        <!-- Sidebar -->
        <app-navbar></app-navbar>
        <!-- Main Content -->
        <div class="flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </div>
    } @else {
      <div class="w-full overflow-auto">
        <router-outlet></router-outlet>
      </div>
    }
  `,
  styles: [],
})
export class AppComponent {
  authService = inject(AuthService);
  title = 'gestao-ordem-servico-frontend';
}
