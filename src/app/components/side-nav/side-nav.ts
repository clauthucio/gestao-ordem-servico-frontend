import { Component, input, output} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html'
})
export class SideNav {
  items = input<NavItem[]>([]);
  appTitle = input('Smart OS');
  appSubtitle = input('Sistema para Gestão de Ordem de Serviço');



  onNovaOS = output<void>();
}
