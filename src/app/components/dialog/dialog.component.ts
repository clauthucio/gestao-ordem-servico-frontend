import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DialogTipo = 'confirmacao' | 'erro' | 'info';

export interface DialogBotao {
  label: string;
  acao: string;
  estilo?: 'primario' | 'perigo' | 'neutro';
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
})
export class DialogComponent {
  @Input() titulo = '';
  @Input() mensagem = '';
  @Input() tipo: DialogTipo = 'info';
  @Input() botoes: DialogBotao[] = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];

  @Output() acao = new EventEmitter<string>();

  get icone(): string {
    const mapa: Record<DialogTipo, string> = {
      confirmacao: 'help',
      erro: 'error',
      info: 'info',
    };
    return mapa[this.tipo];
  }

  get iconeClass(): string {
    const mapa: Record<DialogTipo, string> = {
      confirmacao: 'text-primary',
      erro: 'text-error',
      info: 'text-tertiary',
    };
    return mapa[this.tipo];
  }

  getBotaoClass(estilo: DialogBotao['estilo'] = 'neutro'): string {
    const mapa: Record<NonNullable<DialogBotao['estilo']>, string> = {
      primario: 'bg-primary text-on-primary hover:opacity-90',
      perigo: 'bg-error text-on-error hover:opacity-90',
      neutro: 'bg-surface-container text-on-surface hover:bg-surface-variant',
    };
    return `px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mapa[estilo]}`;
  }

  emitirAcao(acao: string): void {
    this.acao.emit(acao);
  }
}
