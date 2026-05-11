import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { CanComponentDeactivate } from '../../core/guards/unsaved-changes.guard';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';
import { EquipamentoService } from '../../core/http/equipamento.service';
import {
  EquipamentoListItem,
  TipoEquipamento,
} from '../../core/models/equipamento.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/enums/roles.enum';

export type StatusEquipamentoExibicao = 'ativo' | 'emManutencao' | 'inativo';

export type ColunaOrdenacaoEquipamento =
  | 'codigo'
  | 'nome'
  | 'tipo'
  | 'localizacao'
  | 'fabricante'
  | 'modelo'
  | 'status';

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalContainerComponent, DialogComponent],
  templateUrl: './equipamentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipamentos implements OnInit, CanComponentDeactivate {
  private readonly equipamentoService = inject(EquipamentoService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  readonly tipoOpcoes: { value: TipoEquipamento; label: string }[] = [
    { value: 'ELETRICO', label: 'Elétrico' },
    { value: 'MECANICO', label: 'Mecânico' },
    { value: 'HIDRAULICO', label: 'Hidráulico' },
    { value: 'PREDIAL', label: 'Predial' },
  ];

  equipamentos: EquipamentoListItem[] = [];
  /** Lista após filtros — mesma ideia da tela de usuários. */
  equipamentosFiltradosList: EquipamentoListItem[] = [];

  /** Pesquisa global: código, nome, localização, fabricante, modelo. */
  busca = '';
  filtroTipo: TipoEquipamento | '' = '';
  filtroStatusExibicao: 'todos' | StatusEquipamentoExibicao = 'todos';

  ordenacaoColuna: ColunaOrdenacaoEquipamento | null = null;
  ordenacaoDirecao: 'asc' | 'desc' = 'asc';

  carregando = true;
  erro: string | null = null;

  paginaAtual = 1;
  readonly itensPorPagina = 10;

  acaoAbertaId: string | null = null;

  showModalEditar = false;
  equipamentoEditar: EquipamentoListItem | null = null;
  salvandoEdicao = false;

  readonly formEditar = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['' as TipoEquipamento | '', [Validators.required]],
    localizacao: ['', [Validators.required]],
    fabricante: [''],
    modelo: [''],
    ativo: [true],
  });

  showModalNovo = false;
  salvandoNovo = false;

  readonly formNovo = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['' as TipoEquipamento | '', [Validators.required]],
    localizacao: ['', [Validators.required]],
    fabricante: [''],
    modelo: [''],
    ativo: [true],
  });

  showModalHistorico = false;
  equipamentoHistorico: EquipamentoListItem | null = null;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];
  private dialogCallback: (() => void) | null = null;

  /** Técnico: apenas consulta (sem cadastro, edição ou exclusão). */
  get somenteLeitura(): boolean {
    return this.authService.getCurrentUserRole() === UserRole.TECNICO;
  }

  ngOnInit(): void {
    this.carregar();
  }

  canDeactivate(): boolean {
    const novoDirty = this.showModalNovo && this.formNovo.dirty;
    const editDirty = this.showModalEditar && this.formEditar.dirty;
    if (!novoDirty && !editDirty) return true;
    return window.confirm('Há alterações não salvas. Deseja realmente sair?');
  }

  @HostListener('document:click')
  fecharMenuAcoes(): void {
    if (this.acaoAbertaId !== null) {
      this.acaoAbertaId = null;
      this.cdr.markForCheck();
    }
  }

  private fecharMenuAcaoLinha(): void {
    if (this.acaoAbertaId === null) {
      return;
    }
    this.acaoAbertaId = null;
    this.cdr.markForCheck();
  }

  carregar(mensagemSucessoAposEdicao?: string): void {
    this.carregando = true;
    this.erro = null;
    this.cdr.markForCheck();
    this.equipamentoService.listar().subscribe({
      next: (lista) => {
        const dados = Array.isArray(lista) ? lista : [];
        this.equipamentos = dados;
        this.paginaAtual = 1;
        this.recomputarListaFiltrada();
        this.carregando = false;
        if (mensagemSucessoAposEdicao !== undefined) {
          this.dialogTitulo = 'Sucesso';
          this.dialogMensagem = mensagemSucessoAposEdicao;
          this.dialogTipo = 'info';
          this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar os equipamentos.';
        this.carregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFiltroAlterado(): void {
    this.paginaAtual = 1;
    this.recomputarListaFiltrada();
    this.cdr.markForCheck();
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtroTipo = '';
    this.filtroStatusExibicao = 'todos';
    this.paginaAtual = 1;
    this.recomputarListaFiltrada();
    this.cdr.markForCheck();
  }

  onToggleOrdenacao(col: ColunaOrdenacaoEquipamento, event: MouseEvent): void {
    event.stopPropagation();
    if (this.ordenacaoColuna === col) {
      this.ordenacaoDirecao = this.ordenacaoDirecao === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordenacaoColuna = col;
      this.ordenacaoDirecao = 'asc';
    }
    this.recomputarListaFiltrada();
    this.cdr.markForCheck();
  }

  iconeOrdenacaoColuna(col: ColunaOrdenacaoEquipamento): string {
    if (this.ordenacaoColuna !== col) return 'unfold_more';
    return this.ordenacaoDirecao === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ordenacaoColunaAtiva(col: ColunaOrdenacaoEquipamento): boolean {
    return this.ordenacaoColuna === col;
  }

  private recomputarListaFiltrada(): void {
    let lista = [...this.equipamentos];
    const termo = this.busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((e) => {
        const cod = (e.codigo ?? '').toLowerCase();
        const nome = (e.nome ?? '').toLowerCase();
        const loc = (e.localizacao ?? '').toLowerCase();
        const fab = (e.fabricante ?? '').toLowerCase();
        const mod = (e.modelo ?? '').toLowerCase();
        return (
          cod.includes(termo) ||
          nome.includes(termo) ||
          loc.includes(termo) ||
          fab.includes(termo) ||
          mod.includes(termo)
        );
      });
    }
    if (this.filtroTipo) {
      lista = lista.filter((e) => e.tipo === this.filtroTipo);
    }
    if (this.filtroStatusExibicao !== 'todos') {
      lista = lista.filter((e) => this.statusExibicao(e) === this.filtroStatusExibicao);
    }
    if (this.ordenacaoColuna) {
      this.ordenarListaEquipamentos(lista, this.ordenacaoColuna, this.ordenacaoDirecao);
    }
    this.equipamentosFiltradosList = lista;
    const maxPag = Math.max(1, Math.ceil(lista.length / this.itensPorPagina));
    if (this.paginaAtual > maxPag) {
      this.paginaAtual = maxPag;
    }
  }

  private ordenarListaEquipamentos(
    lista: EquipamentoListItem[],
    col: ColunaOrdenacaoEquipamento,
    dir: 'asc' | 'desc',
  ): void {
    const m = dir === 'asc' ? 1 : -1;
    lista.sort((a, b) => {
      let c = 0;
      switch (col) {
        case 'codigo':
          c = this.cmpTextField(a.codigo, b.codigo);
          break;
        case 'nome':
          c = this.cmpTextField(a.nome, b.nome);
          break;
        case 'tipo':
          c = this.cmpTextField(this.tipoLabel(a.tipo), this.tipoLabel(b.tipo));
          break;
        case 'localizacao':
          c = this.cmpTextField(a.localizacao, b.localizacao);
          break;
        case 'fabricante':
          c = this.cmpTextField(a.fabricante, b.fabricante);
          break;
        case 'modelo':
          c = this.cmpTextField(a.modelo, b.modelo);
          break;
        case 'status':
          c =
            this.statusExibicaoRank(this.statusExibicao(a)) -
            this.statusExibicaoRank(this.statusExibicao(b));
          break;
      }
      if (c !== 0) return c * m;
      return this.cmpTextField(a.id, b.id) * m;
    });
  }

  private cmpTextField(x: string | null | undefined, y: string | null | undefined): number {
    const sx = (x ?? '').trim().toLowerCase();
    const sy = (y ?? '').trim().toLowerCase();
    return sx.localeCompare(sy, 'pt-BR');
  }

  private statusExibicaoRank(s: StatusEquipamentoExibicao): number {
    if (s === 'inativo') return 0;
    if (s === 'emManutencao') return 1;
    return 2;
  }

  get equipamentosPaginados(): EquipamentoListItem[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.equipamentosFiltradosList.slice(inicio, inicio + this.itensPorPagina);
  }

  get totalItens(): number {
    return this.equipamentosFiltradosList.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalItens / this.itensPorPagina));
  }

  get paginaInicial(): number {
    if (this.totalItens === 0) return 0;
    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get paginaFinal(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  get paginasVisiveis(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1).slice(0, 3);
  }

  onPaginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      this.cdr.markForCheck();
    }
  }

  onProximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
      this.cdr.markForCheck();
    }
  }

  onIrParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.cdr.markForCheck();
  }

  tipoLabel(tipo: TipoEquipamento): string {
    return this.tipoOpcoes.find((o) => o.value === tipo)?.label ?? tipo;
  }

  statusExibicao(eq: EquipamentoListItem): StatusEquipamentoExibicao {
    if (!eq.ativo) return 'inativo';
    if (eq.ordensAbertasCount > 0) return 'emManutencao';
    return 'ativo';
  }

  statusLabel(eq: EquipamentoListItem): string {
    const s = this.statusExibicao(eq);
    if (s === 'inativo') return 'Inativo';
    if (s === 'emManutencao') return 'Em manutenção';
    return 'Ativo';
  }

  statusClass(eq: EquipamentoListItem): string {
    const s = this.statusExibicao(eq);
    const base =
      'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ';
    if (s === 'ativo') return base + 'bg-tertiary/15 text-tertiary';
    if (s === 'emManutencao') return base + 'bg-secondary/15 text-secondary';
    return base + 'bg-on-surface-variant/15 text-on-surface-variant';
  }

  abrirMenuAcao(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.acaoAbertaId = this.acaoAbertaId === id ? null : id;
    this.cdr.markForCheck();
  }

  isInvalidNovo(campo: 'nome' | 'tipo' | 'localizacao'): boolean {
    const c = this.formNovo.get(campo);
    return !!c && c.invalid && c.touched;
  }

  onNovoEquipamento(): void {
    this.formNovo.reset({
      nome: '',
      tipo: '',
      localizacao: '',
      fabricante: '',
      modelo: '',
      ativo: true,
    });
    this.formNovo.markAsPristine();
    this.salvandoNovo = false;
    this.showModalNovo = true;
    this.cdr.markForCheck();
  }

  fecharModalNovo(): void {
    this.showModalNovo = false;
    this.salvandoNovo = false;
    this.cdr.markForCheck();
  }

  private extrairErroZod(err: any, mensagemPadrao: string): string {
    let msg = err?.error?.erro ?? err?.error?.message ?? mensagemPadrao;
    const details = err?.error?.details;
    if (details && typeof details === 'object') {
      if (details.fieldErrors) {
        const strErros = Object.entries(details.fieldErrors)
          .map(([campo, erros]) => `${campo}: ${Array.isArray(erros) ? erros.join(', ') : erros}`)
          .join(' | ');
        if (strErros) msg += ` Detalhes: ${strErros}`;
      } else if (Array.isArray(details)) {
        const strErros = details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(' | ');
        if (strErros) msg += ` Detalhes: ${strErros}`;
      }
    }
    return msg;
  }

  onSalvarNovo(): void {
    if (this.formNovo.invalid) {
      this.formNovo.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const v = this.formNovo.getRawValue();
    this.salvandoNovo = true;
    this.cdr.markForCheck();
    this.equipamentoService
      .criar({
        nome: v.nome.trim(),
        tipo: v.tipo as TipoEquipamento,
        localizacao: v.localizacao.trim(),
        fabricante: v.fabricante.trim() || undefined,
        modelo: v.modelo.trim() || undefined,
        ativo: v.ativo,
      })
      .pipe(take(1))
      .subscribe({
        next: (criado) => {
          this.salvandoNovo = false;
          this.fecharModalNovo();
          this.carregar(`Equipamento "${criado.nome}" cadastrado com sucesso.`);
        },
        error: (err: any) => {
          this.salvandoNovo = false;
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = this.extrairErroZod(err, 'Não foi possível cadastrar o equipamento.');
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
  }

  onEditar(eq: EquipamentoListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.fecharMenuAcaoLinha();
    this.equipamentoEditar = eq;
    this.formEditar.patchValue({
      nome: eq.nome,
      tipo: eq.tipo,
      localizacao: eq.localizacao,
      fabricante: eq.fabricante ?? '',
      modelo: eq.modelo ?? '',
      ativo: eq.ativo,
    });
    this.showModalEditar = true;
    this.cdr.markForCheck();
  }

  fecharModalEditar(): void {
    this.showModalEditar = false;
    this.equipamentoEditar = null;
    this.salvandoEdicao = false;
    this.cdr.markForCheck();
  }

  onSalvarEdicao(): void {
    if (!this.equipamentoEditar || this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const orig = this.equipamentoEditar;
    const v = this.formEditar.getRawValue();
    const mensagemSucesso = this.mensagemCamposAtualizados(orig, v);
    this.salvandoEdicao = true;
    this.cdr.markForCheck();
    this.equipamentoService
      .atualizar(orig.id, {
        nome: v.nome.trim(),
        tipo: v.tipo as TipoEquipamento,
        localizacao: v.localizacao.trim(),
        fabricante: v.fabricante.trim() || undefined,
        modelo: v.modelo.trim() || undefined,
        ativo: v.ativo,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.salvandoEdicao = false;
          this.fecharModalEditar();
          this.carregar(mensagemSucesso);
        },
        error: (err: any) => {
          this.salvandoEdicao = false;
          this.dialogTitulo = 'Erro';
          this.dialogMensagem = this.extrairErroZod(err, 'Não foi possível salvar o equipamento.');
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
  }

  onHistorico(eq: EquipamentoListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.fecharMenuAcaoLinha();
    this.equipamentoHistorico = eq;
    this.showModalHistorico = true;
    this.cdr.markForCheck();
  }

  fecharModalHistorico(): void {
    this.showModalHistorico = false;
    this.equipamentoHistorico = null;
    this.cdr.markForCheck();
  }

  formatarDataHora(iso: Date | string | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  onExcluir(eq: EquipamentoListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.fecharMenuAcaoLinha();
    if (this.statusExibicao(eq) === 'emManutencao') {
      this.dialogTitulo = 'Não é possível excluir';
      this.dialogMensagem =
        'Equipamento vinculado a uma Ordem de Serviço em aberto. Finalize a Ordem de Serviço para prosseguir';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
      this.dialogCallback = null;
      this.dialogVisivel = true;
      this.cdr.markForCheck();
      return;
    }
    this.dialogTitulo = 'Confirmar exclusão';
    this.dialogMensagem = `Deseja realmente excluir o equipamento "${eq.nome}" (${eq.codigo})? O histórico do equipamento será perdido. Esta ação não pode ser desfeita.`;
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'perigo' },
    ];
    this.dialogCallback = () => this.executarExclusao(eq.id);
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  private executarExclusao(id: string): void {
    this.equipamentoService
      .deletar(id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.carregar('Equipamento foi excluído com sucesso.');
        },
        error: (err: { error?: { erro?: string; message?: string } }) => {
          this.dialogTitulo = 'Erro ao excluir';
          this.dialogMensagem =
            err?.error?.erro ?? err?.error?.message ?? 'Não foi possível excluir o equipamento.';
          this.dialogTipo = 'erro';
          this.dialogBotoes = [{ label: 'Fechar', acao: 'ok', estilo: 'primario' }];
          this.dialogCallback = null;
          this.dialogVisivel = true;
          this.cdr.markForCheck();
        },
      });
  }

  onDialogAcao(acao: string): void {
    this.dialogVisivel = false;
    if (acao === 'confirmar' && this.dialogCallback) {
      this.dialogCallback();
    }
    this.dialogCallback = null;
    this.cdr.markForCheck();
  }

  /** Compara origem (API) com valores do form; normaliza fabricante/modelo (null vs vazio). */
  private mensagemCamposAtualizados(
    orig: EquipamentoListItem,
    v: {
      nome: string;
      tipo: string;
      localizacao: string;
      fabricante: string;
      modelo: string;
      ativo: boolean;
    },
  ): string {
    const alterados: string[] = [];
    if (orig.nome.trim() !== v.nome.trim()) alterados.push('Nome');
    if (orig.tipo !== (v.tipo as TipoEquipamento)) alterados.push('Tipo');
    if (orig.localizacao.trim() !== v.localizacao.trim()) alterados.push('Localização');
    if (this.normFabMod(orig.fabricante) !== this.normFabMod(v.fabricante)) {
      alterados.push('Fabricante');
    }
    if (this.normFabMod(orig.modelo) !== this.normFabMod(v.modelo)) {
      alterados.push('Modelo');
    }
    if (orig.ativo !== v.ativo) alterados.push('Status cadastro');

    if (alterados.length === 0) {
      return 'Equipamento atualizado com sucesso.';
    }
    if (alterados.length === 1) {
      return `${alterados[0]} atualizado com sucesso.`;
    }
    return `${this.juntarListaPt(alterados)} atualizados com sucesso.`;
  }

  private normFabMod(s: string | null | undefined): string | null {
    const t = (s ?? '').trim();
    return t === '' ? null : t;
  }

  private juntarListaPt(itens: string[]): string {
    if (itens.length === 0) return '';
    if (itens.length === 1) return itens[0] ?? '';
    if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
    return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
  }
}
