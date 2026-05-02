import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../features/shared/navbar/navbar.component';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="flex h-screen w-screen">
      <!-- Sidebar -->
      <app-navbar></app-navbar>
      <!-- Main Content -->
      <div class="flex-1 overflow-auto">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: []
})
export class PrivateLayoutComponent {}
