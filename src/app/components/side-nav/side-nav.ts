import { Component, input, output} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './side-nav.html'
})
export class SideNav {
  items = input<NavItem[]>([]);
  appTitle = input('ServiçoPIM');
  appSubtitle = input('Polo Industrial de Manaus');



  onNovaOS = output<void>();
}