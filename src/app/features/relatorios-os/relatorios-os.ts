import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { OrdemStatus, STATUS_LABELS } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import {
  dataAberturaOuCriacao,
  type ManutencaoType,
  type OrdemServico,
  type PrioridadeType,
} from '../../core/models/ordem-servico.model';
import type { Usuario } from '../../core/models/usuario.model';
import {
  type EquipamentoAbertasAgg,
  type GraficoBarraItem,
  type MediaEsperaPecasResultado,
  type ResumoProdutividadeGlobal,
  type TecnicoProdutividadeAgg,
  agruparAbertasPorEquipamento,
  calcularMediaTempoEsperaPecas,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
  filtrarConcluidasOuCanceladasNoPeriodo,
  horasContabilizadasRelatorio,
  mapearStatusOrdemParaEnum,
  montarDadosGraficoTopEquipamento,
  montarDadosGraficoTopOs,
} from '../../core/utils/produtividade-tecnicos.util';

/** Um modo de relatório por vez (dropdown). */
export type RelatorioOsModo = 'concluidas' | 'canceladas' | 'abertas_equipamento' | 'tempo_espera_pecas';

@Component({
  selector: 'app-relatorios-os',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalContainerComponent],
  templateUrl: './relatorios-os.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatoriosOs implements OnInit {
  /** Exposto ao template (fallback `dataCriacao` quando a API omite `aberturaEm`). */
  protected readonly dataAberturaOuCriacao = dataAberturaOuCriacao;

  private readonly ordemServicoService = inject(OrdemServicoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  readonly titulo = 'Relatórios de ordens de serviço';
  readonly subtitulo =
    'Escolha o tipo de relatório e o período. Concluídas: horas líquidas (horas trabalhadas na API menos total em espera de peças, quando informado). Canceladas: tempo até cancelamento. O.S abertas por equipamento: contagem e média de horas por equipamento. Tempo de espera de peças: média entre ordens de serviço concluídas ou canceladas no período que tenham horas de espera registadas na API.';

  readonly modosRelatorio: { value: RelatorioOsModo; label: string }[] = [
    { value: 'concluidas', label: 'Ordens de serviço concluídas' },
    { value: 'canceladas', label: 'Ordens de serviço canceladas' },
    { value: 'abertas_equipamento', label: 'O.S abertas por equipamento' },
    { value: 'tempo_espera_pecas', label: 'Tempo de espera de peças' },
  ];

  modoRelatorio: RelatorioOsModo = 'concluidas';

  todasOrdens: OrdemServico[] = [];
  dataInicio = '';
  dataFim = '';

  agregados: TecnicoProdutividadeAgg[] = [];
  agregadosEquipamento: EquipamentoAbertasAgg[] = [];
  mediaEsperaPecas: MediaEsperaPecasResultado | null = null;

  resumo: ResumoProdutividadeGlobal = {
    totalOs: 0,
    totalHoras: 0,
    mediaHorasPorOsGlobal: null,
    tecnicosComOs: 0,
  };
  chartData: GraficoBarraItem[] = [];

  carregando = true;
  erro: string | null = null;
  exportando = false;

  tecnicoDetalhe: TecnicoProdutividadeAgg | null = null;
  equipamentoDetalhe: EquipamentoAbertasAgg | null = null;

  ngOnInit(): void {
    this.aplicarPeriodoPadraoCampos();
    this.carregar();
  }

  private static ymd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

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
    this.modoRelatorio = 'concluidas';
    this.erro = null;
    this.recomputar();
  }

  aoAlterarModoRelatorio(): void {
    this.tecnicoDetalhe = null;
    this.equipamentoDetalhe = null;
    this.recomputar();
  }

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
    switch (this.modoRelatorio) {
      case 'concluidas':
        this.agregadosEquipamento = [];
        this.mediaEsperaPecas = null;
        this.agregados = computarProdutividadePorTecnico(this.todasOrdens, this.dataInicio, this.dataFim, [
          OrdemStatus.CONCLUIDO,
        ]);
        this.resumo = calcularResumoGlobal(this.agregados);
        this.chartData = montarDadosGraficoTopOs(this.agregados, 5);
        break;
      case 'canceladas':
        this.agregadosEquipamento = [];
        this.mediaEsperaPecas = null;
        this.agregados = computarProdutividadePorTecnico(this.todasOrdens, this.dataInicio, this.dataFim, [
          OrdemStatus.CANCELADO,
        ]);
        this.resumo = calcularResumoGlobal(this.agregados);
        this.chartData = montarDadosGraficoTopOs(this.agregados, 5);
        break;
      case 'abertas_equipamento':
        this.agregados = [];
        this.mediaEsperaPecas = null;
        this.agregadosEquipamento = agruparAbertasPorEquipamento(this.todasOrdens, this.dataInicio, this.dataFim);
        const totalAbertas = this.agregadosEquipamento.reduce((s, a) => s + a.quantidade, 0);
        let totalHorasAbertas = 0;
        for (const a of this.agregadosEquipamento) {
          for (const o of a.ordens) {
            totalHorasAbertas += horasContabilizadasRelatorio(o);
          }
        }
        this.resumo = {
          totalOs: totalAbertas,
          totalHoras: totalHorasAbertas,
          mediaHorasPorOsGlobal: totalAbertas > 0 ? totalHorasAbertas / totalAbertas : null,
          tecnicosComOs: this.agregadosEquipamento.filter((a) => a.quantidade > 0).length,
        };
        this.chartData = montarDadosGraficoTopEquipamento(this.agregadosEquipamento, 5);
        break;
      case 'tempo_espera_pecas':
        this.agregados = [];
        this.agregadosEquipamento = [];
        {
          const universo = filtrarConcluidasOuCanceladasNoPeriodo(this.todasOrdens, this.dataInicio, this.dataFim);
          this.mediaEsperaPecas = calcularMediaTempoEsperaPecas(universo);
          this.resumo = {
            totalOs: universo.length,
            totalHoras: this.mediaEsperaPecas.somaHorasEspera,
            mediaHorasPorOsGlobal: this.mediaEsperaPecas.mediaHoras,
            tecnicosComOs: 0,
          };
          this.chartData = [];
        }
        break;
      default:
        this.agregados = [];
        this.agregadosEquipamento = [];
        this.mediaEsperaPecas = null;
        this.chartData = [];
    }
    this.cdr.markForCheck();
  }

  modoComTabelaTecnico(): boolean {
    return this.modoRelatorio === 'concluidas' || this.modoRelatorio === 'canceladas';
  }

  modoComTabelaEquipamento(): boolean {
    return this.modoRelatorio === 'abertas_equipamento';
  }

  modoTempoEspera(): boolean {
    return this.modoRelatorio === 'tempo_espera_pecas';
  }

  tituloPrincipalExportacao(): string {
    const m = this.modosRelatorio.find((x) => x.value === this.modoRelatorio);
    return `Relatório de ordens de serviço — ${m?.label ?? this.modoRelatorio}`;
  }

  textoFiltroStatusExportacao(): string {
    const m = this.modosRelatorio.find((x) => x.value === this.modoRelatorio);
    return `Tipo de relatório: ${m?.label ?? this.modoRelatorio}`;
  }

  semOrdensNaApi(): boolean {
    return !this.carregando && !this.erro && this.todasOrdens.length === 0;
  }

  avisoFiltroSemResultado(): boolean {
    if (this.carregando || this.erro || this.todasOrdens.length === 0) return false;
    if (this.modoRelatorio === 'concluidas' || this.modoRelatorio === 'canceladas') {
      return this.agregados.length === 0;
    }
    if (this.modoRelatorio === 'abertas_equipamento') {
      return this.agregadosEquipamento.length === 0;
    }
    if (this.modoRelatorio === 'tempo_espera_pecas') {
      return (this.mediaEsperaPecas?.osNoUniverso ?? 0) === 0;
    }
    return false;
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

  abrirDetalheEquipamento(agg: EquipamentoAbertasAgg): void {
    this.equipamentoDetalhe = agg;
    this.cdr.markForCheck();
  }

  fecharDetalheEquipamento(): void {
    this.equipamentoDetalhe = null;
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

  horasRelatorio(o: OrdemServico): number {
    return horasContabilizadasRelatorio(o);
  }

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

      if (this.modoComTabelaTecnico()) {
        const mediaGeralNum =
          this.resumo.mediaHorasPorOsGlobal != null && !Number.isNaN(this.resumo.mediaHorasPorOsGlobal)
            ? Number(this.resumo.mediaHorasPorOsGlobal.toFixed(2))
            : '—';
        const resumoAoa: (string | number)[][] = [
          [this.tituloPrincipalExportacao()],
          [this.textoFiltroStatusExportacao()],
          [`Gerado em: ${gerado}`],
          [`Período: ${this.dataInicio} a ${this.dataFim}`],
          [],
          ['Totais gerais (período)', '', '', ''],
          [
            'Ordens de serviço no período',
            this.resumo.totalOs,
            this.modoRelatorio === 'concluidas' ? 'Horas líquidas (total)' : 'Tempo até cancelamento (total)',
            this.resumo.totalHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
          ],
          ['Média geral h / ordem de serviço', mediaGeralNum, 'Técnicos com ordens no período', this.resumo.tecnicosComOs],
          [],
          ['Técnico', 'Ordens no período', 'Horas totais', 'Média h / ordem'],
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
              'N.º ordem de serviço': o.numeroOrdemServico,
              'Título / resumo': this.resumoTitulo(o),
              'Tipo de serviço': this.tipoManutencaoLabel(o.tipoManutencao),
              Prioridade: this.prioridadeLabel(o.prioridadeOrdemServico),
              'Data abertura / criação': this.formatarDataHora(dataAberturaOuCriacao(o)),
              'Data prevista (meta)': this.formatarDataHora(o.dataPrevistaConclusao),
              'Data conclusão': this.formatarDataHora(o.conclusaoEm),
              'Tempo gasto (h líq.)': this.horasRelatorio(o),
              'Aguardando peça (h)': this.horasAguardandoPecaRelatorio(o) ?? '—',
              Status: this.statusLabel(o.statusOrdemServico),
            });
          }
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalheRows), 'Detalhe ordens de serviço');
      } else if (this.modoComTabelaEquipamento()) {
        const mediaGeralEquip =
          this.resumo.mediaHorasPorOsGlobal != null && !Number.isNaN(this.resumo.mediaHorasPorOsGlobal)
            ? Number(this.resumo.mediaHorasPorOsGlobal.toFixed(2))
            : '—';
        const aoa: (string | number)[][] = [
          [this.tituloPrincipalExportacao()],
          [this.textoFiltroStatusExportacao()],
          [`Gerado em: ${gerado}`],
          [`Período: ${this.dataInicio} a ${this.dataFim}`],
          [],
          ['Ordens de serviço abertas no período', this.resumo.totalOs],
          ['Horas contabilizadas (total)', this.resumo.totalHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })],
          ['Média de horas por ordem de serviço', mediaGeralEquip],
          ['Equipamentos com ordens abertas', this.resumo.tecnicosComOs],
          [],
          ['Equipamento', 'Quantidade de ordens abertas', 'Média h / ordem de serviço'],
          ...this.agregadosEquipamento.map((a) => [
            a.nomeExibicao,
            a.quantidade,
            a.mediaHorasPorOrdemServico != null ? Number(a.mediaHorasPorOrdemServico.toFixed(2)) : '—',
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Por equipamento');
        const rows: Record<string, string | number>[] = [];
        for (const a of this.agregadosEquipamento) {
          for (const o of a.ordens) {
            rows.push({
              Equipamento: a.nomeExibicao,
              'N.º ordem de serviço': o.numeroOrdemServico,
              Técnico: o.tecnicoNome ?? '—',
              Prioridade: this.prioridadeLabel(o.prioridadeOrdemServico),
              Abertura: this.formatarDataHora(dataAberturaOuCriacao(o)),
            });
          }
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detalhe ordens abertas');
      } else {
        const m = this.mediaEsperaPecas;
        const aoa: (string | number)[][] = [
          [this.tituloPrincipalExportacao()],
          [this.textoFiltroStatusExportacao()],
          [`Gerado em: ${gerado}`],
          [`Período: ${this.dataInicio} a ${this.dataFim}`],
          [],
          [
            'Ordens no universo (concluídas ou canceladas no período)',
            m?.osNoUniverso ?? 0,
            'Média h espera (só ordens com tempo > 0)',
            m?.mediaHoras != null ? Number(m.mediaHoras.toFixed(2)) : '—',
          ],
          ['Ordens com tempo de espera registado', m?.osComEsperaRegistada ?? 0, 'Soma horas espera', m?.somaHorasEspera ?? 0],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Tempo espera peças');
      }

      const nome = `relatorio-os_${this.modoRelatorio}_${this.dataInicio}_${this.dataFim}.xlsx`;
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
      const lineH = 14;
      let yHead = 32;
      doc.setFontSize(16);
      doc.text(this.tituloPrincipalExportacao(), 40, yHead);
      yHead += 22;
      doc.setFontSize(10);
      doc.text(this.textoFiltroStatusExportacao(), 40, yHead);
      yHead += lineH;
      doc.text(`Período: ${this.dataInicio} a ${this.dataFim}`, 40, yHead);
      yHead += lineH;
      doc.text(`Gerado em: ${geradoPdf}`, 40, yHead);
      yHead += lineH + 8;

      if (this.modoComTabelaTecnico()) {
        const mediaGeralPdf = this.formatarHoras(this.resumo.mediaHorasPorOsGlobal);
        const totaisLinha = `Totais: ${this.resumo.totalOs} ordens de serviço | ${this.resumo.totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h | Média h / ordem: ${mediaGeralPdf} | ${this.resumo.tecnicosComOs} técnico(s)`;
        const totaisLines = doc.splitTextToSize(totaisLinha, 720);
        doc.text(totaisLines, 40, yHead);
        yHead += totaisLines.length * lineH + 12;

        autoTable(doc, {
          startY: yHead,
          head: [['Técnico', 'Ordens no período', 'Horas totais', 'Média h / ordem']],
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
        doc.text('Detalhamento por ordem de serviço', 40, y);
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
              this.formatarDataCurta(dataAberturaOuCriacao(o)),
              this.formatarDataCurta(o.dataPrevistaConclusao),
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
            ['Técnico', 'N.º ordem', 'Resumo', 'Tipo', 'Prior.', 'Abertura', 'Prevista', 'Conclusão', 'h líq.', 'h aguard.', 'Status'],
          ],
          body: bodyDet,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [79, 55, 138] },
        });
      } else if (this.modoComTabelaEquipamento()) {
        autoTable(doc, {
          startY: yHead,
          head: [['Equipamento', 'Ordens abertas', 'Média h / ordem']],
          body: this.agregadosEquipamento.map((a) => [
            a.nomeExibicao,
            String(a.quantidade),
            a.mediaHorasPorOrdemServico != null ? a.mediaHorasPorOrdemServico.toFixed(2) : '—',
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [103, 80, 164] },
        });
      } else {
        const m = this.mediaEsperaPecas;
        const linhas = [
          `Ordens no período (concluídas ou canceladas): ${m?.osNoUniverso ?? 0}`,
          `Ordens com tempo de espera registado (> 0 h): ${m?.osComEsperaRegistada ?? 0}`,
          `Média de horas em espera de peças (entre essas ordens): ${m?.mediaHoras != null ? m.mediaHoras.toFixed(2) : '—'} h`,
        ];
        doc.text(linhas, 40, yHead);
      }

      doc.save(`relatorio-os_${this.modoRelatorio}_${this.dataInicio}_${this.dataFim}.pdf`);
    } finally {
      this.ngZone.run(() => {
        this.exportando = false;
        this.cdr.markForCheck();
      });
    }
  }
}
