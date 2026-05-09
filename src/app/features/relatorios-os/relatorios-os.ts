import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { OrdemStatus, STATUS_LABELS } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import type { ManutencaoType, OrdemServico, PrioridadeType } from '../../core/models/ordem-servico.model';
import type { Usuario } from '../../core/models/usuario.model';
import {
  type GraficoBarraItem,
  type ResumoProdutividadeGlobal,
  type TecnicoProdutividadeAgg,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
  horasContabilizadasRelatorio,
  mapearStatusOrdemParaEnum,
  montarDadosGraficoTopOs,
} from '../../core/utils/produtividade-tecnicos.util';

@Component({
  selector: 'app-relatorios-os',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalContainerComponent],
  templateUrl: './relatorios-os.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatoriosOs implements OnInit {
  private readonly ordemServicoService = inject(OrdemServicoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  readonly titulo = 'Relatório de Produtividade por Técnico';
  readonly subtitulo =
    'Acompanhe a quantidade de ordens de serviço e esforço por técnico. Para OS concluídas, as horas trabalhadas vêm do backend (líquido, já descontando o tempo em aguardando peça).';

  /** Ordem fixa das opções do filtro (dropdown). */
  readonly statusRelatorioOpcoes: OrdemStatus[] = [
    OrdemStatus.ABERTO,
    OrdemStatus.EM_ANDAMENTO,
    OrdemStatus.AGUARDANDO_PECA,
    OrdemStatus.CONCLUIDO,
    OrdemStatus.CANCELADO,
  ];

  private readonly statusPadraoRelatorio: OrdemStatus[] = [OrdemStatus.CONCLUIDO];

  /** Pelo menos um status deve permanecer selecionado (valor aplicado ao relatório). */
  statusSelecionados: OrdemStatus[] = [...this.statusPadraoRelatorio];

  /** Cópia de trabalho no painel de status até o utilizador confirmar. */
  statusSelecionadosPendente: OrdemStatus[] = [...this.statusPadraoRelatorio];

  painelStatusAberto = false;

  @ViewChild('statusFiltroRoot', { read: ElementRef }) statusFiltroRoot?: ElementRef<HTMLElement>;

  todasOrdens: OrdemServico[] = [];
  dataInicio = '';
  dataFim = '';

  agregados: TecnicoProdutividadeAgg[] = [];
  resumo: ResumoProdutividadeGlobal = {
    totalOs: 0,
    totalHoras: 0,
    mediaHorasPorOsGlobal: null,
    tecnicosComOs: 0,
  };
  /** Um conjunto de cartões (resumo) por cada status atualmente marcado no filtro. */
  resumosPorStatus: { status: OrdemStatus; resumo: ResumoProdutividadeGlobal }[] = [];
  chartData: GraficoBarraItem[] = [];

  carregando = true;
  erro: string | null = null;
  exportando = false;

  tecnicoDetalhe: TecnicoProdutividadeAgg | null = null;

  ngOnInit(): void {
    this.aplicarPeriodoPadraoCampos();
    this.carregar();
  }

  private static ymd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /** Data final = dia civil corrente; data inicial = 7 dias antes (calendário local). */
  private static periodoPadraoRelatorio(ref: Date = new Date()): { dataInicio: string; dataFim: string } {
    const fim = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 7);
    return { dataInicio: RelatoriosOs.ymd(ini), dataFim: RelatoriosOs.ymd(fim) };
  }

  private aplicarPeriodoPadraoCampos(): void {
    const p = RelatoriosOs.periodoPadraoRelatorio();
    this.dataInicio = p.dataInicio;
    this.dataFim = p.dataFim;
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.cdr.markForCheck();
    forkJoin({
      ordens: this.ordemServicoService.listar(),
      usuarios: this.usuarioService.listar().pipe(catchError(() => of([] as Usuario[]))),
    }).subscribe({
      next: ({ ordens, usuarios }) => {
        const nomePorId = new Map(usuarios.map((u) => [u.idUsuario, u.nomeUsuario]));
        this.todasOrdens = ordens.map((o) => RelatoriosOs.enriquecerNomeTecnico(o, nomePorId));
        this.carregando = false;
        this.recomputar();
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErroCarregar(err);
        this.carregando = false;
        this.todasOrdens = [];
        this.recomputar();
      },
    });
  }

  /** Preenche `tecnicoNome` via `/app/usuarios` quando a OS só traz `idTecnico` (mesmo padrão da lista de OS). */
  private static enriquecerNomeTecnico(o: OrdemServico, nomePorId: Map<string, string>): OrdemServico {
    const id = o.idTecnico?.trim();
    if (!id) return o;
    if (o.tecnicoNome?.trim()) return o;
    const nome = nomePorId.get(id);
    if (!nome?.trim()) return o;
    return { ...o, tecnicoNome: nome.trim() };
  }

  limparFiltros(): void {
    this.aplicarPeriodoPadraoCampos();
    this.statusSelecionados = [...this.statusPadraoRelatorio];
    this.statusSelecionadosPendente = [...this.statusPadraoRelatorio];
    this.painelStatusAberto = false;
    this.erro = null;
    this.recomputar();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.painelStatusAberto) return;
    const root = this.statusFiltroRoot?.nativeElement;
    const t = ev.target;
    if (root && t instanceof Node && root.contains(t)) return;
    this.cancelarPainelStatus();
  }

  /** Abre ou fecha o painel; ao fechar pelo gatilho, descarta alterações pendentes (igual a Cancelar). */
  togglePainelStatusFiltro(ev: Event): void {
    ev.stopPropagation();
    if (this.painelStatusAberto) {
      this.cancelarPainelStatus();
    } else {
      this.statusSelecionadosPendente = [...this.statusSelecionados];
      this.painelStatusAberto = true;
    }
    this.cdr.markForCheck();
  }

  cancelarPainelStatus(ev?: Event): void {
    ev?.stopPropagation();
    this.statusSelecionadosPendente = [...this.statusSelecionados];
    this.painelStatusAberto = false;
    this.cdr.markForCheck();
  }

  confirmarSelecaoStatus(ev?: Event): void {
    ev?.stopPropagation();
    if (this.statusSelecionadosPendente.length === 0) {
      this.erro = 'Selecione pelo menos um status antes de confirmar.';
      this.cdr.markForCheck();
      return;
    }
    this.erro = null;
    this.statusSelecionados = [...this.statusSelecionadosPendente];
    this.painelStatusAberto = false;
    this.recomputar();
  }

  statusMarcadoPendente(s: OrdemStatus): boolean {
    return this.statusSelecionadosPendente.includes(s);
  }

  aoAlterarCheckboxPendente(s: OrdemStatus, ev: Event): void {
    const t = ev.target;
    const marcado = t instanceof HTMLInputElement ? t.checked : false;
    this.alternarStatusPendente(s, marcado);
  }

  alternarStatusPendente(s: OrdemStatus, marcado: boolean): void {
    if (marcado) {
      if (!this.statusSelecionadosPendente.includes(s)) {
        this.statusSelecionadosPendente = [...this.statusSelecionadosPendente, s];
      }
      this.erro = null;
      this.cdr.markForCheck();
      return;
    }
    if (this.statusSelecionadosPendente.length === 1 && this.statusSelecionadosPendente[0] === s) {
      this.erro = 'Selecione pelo menos um status.';
      this.cdr.markForCheck();
      return;
    }
    this.statusSelecionadosPendente = this.statusSelecionadosPendente.filter((x) => x !== s);
    this.erro = null;
    this.cdr.markForCheck();
  }

  /** Recalcula o relatório quando as datas mudam. */
  aoAlterarFiltro(): void {
    if (!this.dataInicio || !this.dataFim) {
      return;
    }
    if (this.dataInicio > this.dataFim) {
      this.erro = 'A data inicial não pode ser maior que a data final.';
      this.cdr.markForCheck();
      return;
    }
    this.erro = null;
    this.recomputar();
  }

  private recomputar(): void {
    this.agregados = computarProdutividadePorTecnico(
      this.todasOrdens,
      this.dataInicio,
      this.dataFim,
      [...this.statusSelecionados],
    );
    this.resumo = calcularResumoGlobal(this.agregados);
    const ordemStatus = (a: OrdemStatus, b: OrdemStatus) =>
      this.statusRelatorioOpcoes.indexOf(a) - this.statusRelatorioOpcoes.indexOf(b);
    this.resumosPorStatus = [...this.statusSelecionados].sort(ordemStatus).map((status) => ({
      status,
      resumo: calcularResumoGlobal(
        computarProdutividadePorTecnico(this.todasOrdens, this.dataInicio, this.dataFim, [status]),
      ),
    }));
    this.chartData = montarDadosGraficoTopOs(this.agregados, 5);
    this.cdr.markForCheck();
  }

  /** Primeira linha dos PDF/Excel exportados. */
  tituloPrincipalExportacao(): string {
    return 'Relatório de ordens de serviço — Produtividade por técnico';
  }

  /** Metadados: status atualmente incluídos no relatório. */
  textoFiltroStatusExportacao(): string {
    const ordem = (a: OrdemStatus, b: OrdemStatus) =>
      this.statusRelatorioOpcoes.indexOf(a) - this.statusRelatorioOpcoes.indexOf(b);
    const labels = [...this.statusSelecionados].sort(ordem).map((st) => STATUS_LABELS[st]);
    return `Status no filtro: ${labels.join(', ')}`;
  }

  /** Lista vazia retornada pela API (sem erro HTTP). */
  semOrdensNaApi(): boolean {
    return !this.carregando && !this.erro && this.todasOrdens.length === 0;
  }

  /** Há ordens carregadas, mas nenhuma entra no período com os status selecionados. */
  avisoFiltroSemResultado(): boolean {
    return !this.carregando && !this.erro && this.todasOrdens.length > 0 && this.agregados.length === 0;
  }

  private mensagemErroCarregar(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Não foi possível contactar o servidor. Verifique se a API está em execução, a URL em environment e se não há bloqueio de rede ou CORS.';
      }
      if (err.status === 401) {
        return 'Sessão expirada ou não autorizado. Inicie sessão novamente.';
      }
      if (err.status === 403) {
        return 'Sem permissão para listar ordens de serviço.';
      }
      if (err.status === 404) {
        return 'Recurso não encontrado (404). Confirme o endpoint da API.';
      }
      if (err.status >= 500) {
        return 'Erro no servidor. Tente mais tarde.';
      }
      return `Não foi possível carregar as ordens (${err.status}).`;
    }
    return 'Não foi possível carregar as ordens de serviço.';
  }

  abrirDetalheTecnico(agg: TecnicoProdutividadeAgg): void {
    this.tecnicoDetalhe = agg;
    this.cdr.markForCheck();
  }

  fecharDetalheTecnico(): void {
    this.tecnicoDetalhe = null;
    this.cdr.markForCheck();
  }

  iniciais(nome: string): string {
    const p = nome.trim().split(/\s+/).filter(Boolean);
    if (p.length === 0) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  tipoManutencaoLabel(t: ManutencaoType): string {
    const m: Record<ManutencaoType, string> = {
      CORRETIVA: 'Corretiva',
      PREVENTIVA: 'Preventiva',
      PREDITIVA: 'Preditiva',
    };
    return m[t] ?? t;
  }

  prioridadeLabel(p: PrioridadeType): string {
    const m: Record<PrioridadeType, string> = {
      BAIXA: 'Baixa',
      MEDIA: 'Média',
      ALTA: 'Alta',
      CRITICA: 'Crítica',
    };
    return m[p] ?? p;
  }

  formatarDataCurta(iso: Date | string | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
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

  /** Data e hora em que o relatório foi gerado/exportado (pt-BR). */
  formatarMomentoGeracao(ref: Date = new Date()): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(ref);
  }

  formatarHoras(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h`;
  }

  /** Horas para soma/exportação: concluídas usam só `horasTrabalhadas` da API; demais mantêm heurística em `horasContabilizadasRelatorio`. */
  horasRelatorio(o: OrdemServico): number {
    return horasContabilizadasRelatorio(o);
  }

  /** Total em aguardando peça (campo da API), quando existir. */
  horasAguardandoPecaRelatorio(o: OrdemServico): number | null {
    const v = o.horasAguardandoPecaAcumuladas;
    if (typeof v !== 'number' || Number.isNaN(v)) return null;
    return v;
  }

  resumoTitulo(os: OrdemServico): string {
    const s = (os.descricaoServico ?? '').trim();
    if (s) return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    const f = (os.descricaoFalha ?? '').trim();
    return f.length > 80 ? `${f.slice(0, 80)}…` : f || '—';
  }

  statusLabel(s: OrdemStatus): string {
    const st = mapearStatusOrdemParaEnum(s);
    return STATUS_LABELS[st] ?? String(s);
  }

  async exportarExcel(): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    this.cdr.markForCheck();
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const gerado = this.formatarMomentoGeracao();
      const mediaGeralNum =
        this.resumo.mediaHorasPorOsGlobal != null && !Number.isNaN(this.resumo.mediaHorasPorOsGlobal)
          ? Number(this.resumo.mediaHorasPorOsGlobal.toFixed(2))
          : '—';

      const resumoAoa: (string | number)[][] = [
        [this.tituloPrincipalExportacao()],
        [this.textoFiltroStatusExportacao()],
        [`Gerado em: ${gerado}`],
        [`Período: ${this.dataInicio} a ${this.dataFim}`],
        [this.titulo],
        [],
        ['Totais gerais (período)', '', '', ''],
        [
          'OS no período',
          this.resumo.totalOs,
          'Horas totais',
          this.resumo.totalHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        ],
        ['Média geral h/OS', mediaGeralNum, 'Técnicos com OS', this.resumo.tecnicosComOs],
        [],
        ['Técnico', 'OS no período', 'Horas totais', 'Média h/OS'],
        ...this.agregados.map((a) => [
          a.nomeExibicao,
          a.osConcluidas,
          a.horasTotais,
          a.mediaHorasPorOs != null ? Number(a.mediaHorasPorOs.toFixed(2)) : '—',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoAoa), 'Resumo por técnico');

      const detalheRows: Record<string, string | number>[] = [];
      for (const a of this.agregados) {
        for (const o of a.ordens) {
          detalheRows.push({
            Técnico: a.nomeExibicao,
            'Nº OS': o.numeroOrdemServico,
            'Título / resumo': this.resumoTitulo(o),
            'Tipo de serviço': this.tipoManutencaoLabel(o.tipoManutencao),
            Prioridade: this.prioridadeLabel(o.prioridadeOrdemServico),
            'Data abertura': this.formatarDataHora(o.aberturaEm),
            'Data conclusão': this.formatarDataHora(o.conclusaoEm),
            'Tempo gasto (h)': this.horasRelatorio(o),
            'Aguardando peça (h)': this.horasAguardandoPecaRelatorio(o) ?? '—',
            Status: this.statusLabel(o.statusOrdemServico),
          });
        }
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalheRows), 'Detalhe OS');

      const nome = `produtividade-tecnicos_${this.dataInicio}_${this.dataFim}.xlsx`;
      XLSX.writeFile(wb, nome);
    } finally {
      this.ngZone.run(() => {
        this.exportando = false;
        this.cdr.markForCheck();
      });
    }
  }

  async exportarPdf(): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    this.cdr.markForCheck();
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableMod = await import('jspdf-autotable');
      const autoTable = autoTableMod.default;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' }) as import('jspdf').jsPDF & {
        lastAutoTable?: { finalY: number };
      };

      const geradoPdf = this.formatarMomentoGeracao();
      const mediaGeralPdf = this.formatarHoras(this.resumo.mediaHorasPorOsGlobal);

      const lineH = 14;
      let yHead = 32;
      doc.setFontSize(16);
      doc.text(this.tituloPrincipalExportacao(), 40, yHead);
      yHead += 22;
      doc.setFontSize(10);
      const filterLines = doc.splitTextToSize(this.textoFiltroStatusExportacao(), 720);
      doc.text(filterLines, 40, yHead);
      yHead += filterLines.length * lineH + 4;
      doc.text(this.titulo, 40, yHead);
      yHead += lineH;
      doc.text(`Período: ${this.dataInicio} a ${this.dataFim}`, 40, yHead);
      yHead += lineH;
      doc.text(`Gerado em: ${geradoPdf}`, 40, yHead);
      yHead += lineH;
      const totaisLinha = `Totais gerais: ${this.resumo.totalOs} OS no período | ${this.resumo.totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h totais | Média geral h/OS: ${mediaGeralPdf} | ${this.resumo.tecnicosComOs} técnico(s)`;
      const totaisLines = doc.splitTextToSize(totaisLinha, 720);
      doc.text(totaisLines, 40, yHead);
      yHead += totaisLines.length * lineH + 12;

      autoTable(doc, {
        startY: yHead,
        head: [['Técnico', 'OS no período', 'Horas totais', 'Média h/OS']],
        body: this.agregados.map((a) => [
          a.nomeExibicao,
          String(a.osConcluidas),
          String(a.horasTotais),
          a.mediaHorasPorOs != null ? a.mediaHorasPorOs.toFixed(2) : '—',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [103, 80, 164] },
      });

      const finalY = doc.lastAutoTable?.finalY ?? 120;
      let y = finalY + 24;
      if (y > 520) {
        doc.addPage();
        y = 40;
      }

      doc.setFontSize(11);
      doc.text('Detalhamento por OS', 40, y);
      y += 14;

      const bodyDet: string[][] = [];
      for (const a of this.agregados) {
        for (const o of a.ordens) {
          const hAg = this.horasAguardandoPecaRelatorio(o);
          bodyDet.push([
            a.nomeExibicao,
            o.numeroOrdemServico,
            this.resumoTitulo(o).slice(0, 60),
            this.tipoManutencaoLabel(o.tipoManutencao),
            this.prioridadeLabel(o.prioridadeOrdemServico),
            this.formatarDataCurta(o.aberturaEm),
            this.formatarDataCurta(o.conclusaoEm),
            String(this.horasRelatorio(o)),
            hAg != null ? String(hAg) : '—',
            this.statusLabel(o.statusOrdemServico),
          ]);
        }
      }

      autoTable(doc, {
        startY: y,
        head: [
          [
            'Técnico',
            'Nº OS',
            'Resumo',
            'Tipo',
            'Prior.',
            'Abertura',
            'Conclusão',
            'h trab.',
            'h aguard.',
            'Status',
          ],
        ],
        body: bodyDet,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [79, 55, 138] },
      });

      doc.save(`produtividade-tecnicos_${this.dataInicio}_${this.dataFim}.pdf`);
    } finally {
      this.ngZone.run(() => {
        this.exportando = false;
        this.cdr.markForCheck();
      });
    }
  }
}
