import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
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
import type { ManutencaoType, OrdemServico, PrioridadeType } from '../../core/models/ordem-servico.model';
import type { Usuario } from '../../core/models/usuario.model';
import {
  type GraficoBarraItem,
  type ResumoProdutividadeGlobal,
  type TecnicoProdutividadeAgg,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
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

  readonly titulo = 'Relatório de Produtividade por Técnico';
  readonly subtitulo =
    'Acompanhe a quantidade de ordens de serviço concluídas, horas trabalhadas e média de esforço por técnico no período selecionado.';

  readonly tipoOpcoes: { value: ManutencaoType | ''; label: string }[] = [
    { value: '', label: 'Todos os tipos' },
    { value: 'CORRETIVA', label: 'Corretiva' },
    { value: 'PREVENTIVA', label: 'Preventiva' },
    { value: 'PREDITIVA', label: 'Preditiva' },
  ];

  readonly prioridadeOpcoes: { value: PrioridadeType | ''; label: string }[] = [
    { value: '', label: 'Todas as prioridades' },
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'CRITICA', label: 'Crítica' },
  ];

  todasOrdens: OrdemServico[] = [];
  dataInicio = '';
  dataFim = '';
  filtroTipo: ManutencaoType | '' = '';
  filtroPrioridade: PrioridadeType | '' = '';

  agregados: TecnicoProdutividadeAgg[] = [];
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

  ngOnInit(): void {
    const fim = new Date();
    const ini = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
    ini.setFullYear(ini.getFullYear() - 1);
    this.dataInicio = RelatoriosOs.ymd(ini);
    this.dataFim = RelatoriosOs.ymd(fim);
    this.carregar();
  }

  private static ymd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
        this.agregados = [];
        this.resumo = calcularResumoGlobal([]);
        this.chartData = [];
        this.cdr.markForCheck();
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

  aplicarFiltros(): void {
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
      this.filtroTipo,
      this.filtroPrioridade,
    );
    this.resumo = calcularResumoGlobal(this.agregados);
    this.chartData = montarDadosGraficoTopOs(this.agregados, 5);
    this.cdr.markForCheck();
  }

  /** Lista vazia retornada pela API (sem erro HTTP). */
  semOrdensNaApi(): boolean {
    return !this.carregando && !this.erro && this.todasOrdens.length === 0;
  }

  /** Há ordens carregadas, mas nenhuma entra no relatório (período / só concluídas / filtros). */
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

  formatarHoras(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h`;
  }

  resumoTitulo(os: OrdemServico): string {
    const s = (os.descricaoServico ?? '').trim();
    if (s) return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    const f = (os.descricaoFalha ?? '').trim();
    return f.length > 80 ? `${f.slice(0, 80)}…` : f || '—';
  }

  statusLabel(s: OrdemStatus): string {
    return STATUS_LABELS[s] ?? String(s);
  }

  async exportarExcel(): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    this.cdr.markForCheck();
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const resumoRows = this.agregados.map((a) => ({
        Técnico: a.nomeExibicao,
        'OS concluídas': a.osConcluidas,
        'Horas totais': a.horasTotais,
        'Média h/OS': a.mediaHorasPorOs ?? '—',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoRows), 'Resumo por técnico');

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
            'Tempo gasto (h)': o.horasTrabalhadas ?? 0,
            Status: this.statusLabel(o.statusOrdemServico),
          });
        }
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalheRows), 'Detalhe OS');

      const nome = `produtividade-tecnicos_${this.dataInicio}_${this.dataFim}.xlsx`;
      XLSX.writeFile(wb, nome);
    } finally {
      this.exportando = false;
      this.cdr.markForCheck();
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

      doc.setFontSize(14);
      doc.text(this.titulo, 40, 36);
      doc.setFontSize(10);
      doc.text(`Período: ${this.dataInicio} a ${this.dataFim}`, 40, 52);
      doc.text(
        `Tipo: ${this.filtroTipo || 'Todos'} | Prioridade: ${this.filtroPrioridade || 'Todas'}`,
        40,
        66,
      );

      autoTable(doc, {
        startY: 78,
        head: [['Técnico', 'OS concluídas', 'Horas totais', 'Média h/OS']],
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
          bodyDet.push([
            a.nomeExibicao,
            o.numeroOrdemServico,
            this.resumoTitulo(o).slice(0, 60),
            this.tipoManutencaoLabel(o.tipoManutencao),
            this.prioridadeLabel(o.prioridadeOrdemServico),
            this.formatarDataCurta(o.aberturaEm),
            this.formatarDataCurta(o.conclusaoEm),
            String(o.horasTrabalhadas ?? 0),
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
            'h',
            'Status',
          ],
        ],
        body: bodyDet,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [79, 55, 138] },
      });

      doc.save(`produtividade-tecnicos_${this.dataInicio}_${this.dataFim}.pdf`);
    } finally {
      this.exportando = false;
      this.cdr.markForCheck();
    }
  }
}
