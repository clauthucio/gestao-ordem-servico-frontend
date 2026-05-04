import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <!-- items-start + padding: mais espaço abaixo dos campos → listas de <select> nativo tendem a abrir para baixo (heurística do SO/navegador). -->
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10 sm:pt-14 pb-8"
      (click)="onBackdropClick($event)"
    >
      <!-- Dialog -->
      <div
        class="relative bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 shrink-0">
          <h2 class="text-lg font-bold text-on-surface">{{ titulo }}</h2>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            (click)="fechar.emit()"
            type="button"
            aria-label="Fechar"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Content (scrollable) -->
        <div class="overflow-y-auto flex-1 px-6 py-6">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class ModalContainerComponent {
  @Input() titulo = '';
  @Output() fechar = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.fechar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.fechar.emit();
  }
}
