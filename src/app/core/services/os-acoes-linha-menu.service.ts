import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';

/**
 * Garante no máximo um menu de ações (⋮) aberto entre todas as instâncias de `app-os-acoes-linha`.
 * Fecha ao `mousedown` fora do host da OS atualmente aberta (captura, antes do `click` com stopPropagation).
 */
@Injectable({ providedIn: 'root' })
export class OsAcoesLinhaMenuService {
  private readonly doc = inject(DOCUMENT);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly openOrdemServicoId = signal<string | null>(null);

  constructor() {
    const handler = (ev: Event) => this.onDocumentMouseDownCapture(ev);
    this.ngZone.runOutsideAngular(() => {
      this.doc.addEventListener('mousedown', handler, true);
    });
    this.destroyRef.onDestroy(() => {
      this.doc.removeEventListener('mousedown', handler, true);
    });
  }

  private escapeSelectorAttrFragment(value: string): string {
    if (typeof globalThis.CSS !== 'undefined' && typeof globalThis.CSS.escape === 'function') {
      return globalThis.CSS.escape(value);
    }
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private onDocumentMouseDownCapture(ev: Event): void {
    const id = this.openOrdemServicoId();
    if (id === null) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;

    const host = this.doc.querySelector(
      `app-os-acoes-linha[data-os-id="${this.escapeSelectorAttrFragment(id)}"]`
    );
    if (host?.contains(target)) return;

    this.ngZone.run(() => this.openOrdemServicoId.set(null));
  }

  /** Abre esta OS; se já estiver aberta, fecha (toggle). Substitui qualquer outra aberta. */
  select(ordemServicoId: string): void {
    this.openOrdemServicoId.update((cur) => (cur === ordemServicoId ? null : ordemServicoId));
  }

  close(): void {
    this.openOrdemServicoId.set(null);
  }
}
