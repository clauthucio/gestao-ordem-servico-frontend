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
import { EquipamentoService } from '../../core/http/equipamento.service';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import type { EquipamentoListItem } from '../../core/models/equipamento.model';
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
  agruparConcluidasOuCanceladasPorEquipamento,
  calcularMediaTempoEsperaPecas,
  calcularResumoGlobal,
  computarProdutividadePorTecnico,
  filtrarConcluidasOuCanceladasNoPeriodo,
  horasContabilizadasRelatorio,
  mapearStatusOrdemParaEnum,
  montarDadosGraficoTopEquipamento,
  montarDadosGraficoTopOs,
} from '../../core/utils/produtividade-tecnicos.util';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/enums/roles.enum';

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
  private readonly equipamentoService = inject(EquipamentoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly authService = inject(AuthService);

  readonly titulo = 'Relatórios de ordens de serviço';

  /**
   * Relatório «Tempo de espera de peças» (`tempo_espera_pecas`): oculto no select até implementação futura.
   * Mantidos no código: `RelatorioOsModo`, `recomputar()` (case `tempo_espera_pecas`), `modoTempoEspera()`,
   * exportações e o bloco `@if (modoTempoEspera())` no template.
   * Para reativar: (1) readicionar `{ value: 'tempo_espera_pecas', label: 'Tempo de espera de peças' }` em `modosRelatorio`;
   * (2) acrescentar ao fim de `subtitulo` a frase sobre média de espera entre O.S. concluídas ou canceladas com horas registadas na API;
   * (3) restaurar no rodapé «Regras» do HTML o texto guardado em comentário HTML.
   */
  readonly subtitulo =
    'Escolha o tipo de relatório e o período. Concluídas: horas líquidas (horas trabalhadas na API menos total em espera de peças, quando informado). Canceladas: tempo até cancelamento. O.S. por equipamento: equipamentos com O.S. concluídas ou canceladas no período e quantidade por equipamento.';

  readonly modosRelatorio: { value: RelatorioOsModo; label: string }[] = [
    { value: 'concluidas', label: 'O.S. Concluídas' },
    { value: 'canceladas', label: 'O.S. Canceladas' },
    { value: 'abertas_equipamento', label: 'O.S. por equipamento' },
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

  /** Técnico: modo consulta nesta área. */
  get somenteLeituraTecnico(): boolean {
    return this.authService.getCurrentUserRole() === UserRole.TECNICO;
  }

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
      equipamentos: this.equipamentoService.listar().pipe(catchError(() => of([] as EquipamentoListItem[]))),
    }).subscribe({
      next: ({ ordens, usuarios, equipamentos }) => {
        const nomeTecnicoPorId = new Map(usuarios.map((u) => [u.idUsuario, u.nomeUsuario]));
        const nomeEquipPorId = new Map(equipamentos.map((e) => [e.id, e.nome]));
        this.todasOrdens = ordens.map((o) =>
          RelatoriosOs.enriquecerNomeEquipamento(
            RelatoriosOs.enriquecerNomeTecnico(o, nomeTecnicoPorId),
            nomeEquipPorId,
          ),
        );
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

  private static enriquecerNomeEquipamento(o: OrdemServico, nomePorId: Map<string, string>): OrdemServico {
    const id = o.idEquipamento?.trim();
    if (!id) return o;
    if (o.equipamentoNome?.trim()) return o;
    const nome = nomePorId.get(id);
    if (!nome?.trim()) return o;
    return { ...o, equipamentoNome: nome.trim() };
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
        this.agregadosEquipamento = agruparConcluidasOuCanceladasPorEquipamento(
          this.todasOrdens,
          this.dataInicio,
          this.dataFim,
        );
        const totalOsEquipamento = this.agregadosEquipamento.reduce((s, a) => s + a.quantidade, 0);
        let totalHorasEquipamento = 0;
        for (const a of this.agregadosEquipamento) {
          for (const o of a.ordens) {
            totalHorasEquipamento += horasContabilizadasRelatorio(o);
          }
        }
        this.resumo = {
          totalOs: totalOsEquipamento,
          totalHoras: totalHorasEquipamento,
          mediaHorasPorOsGlobal:
            totalOsEquipamento > 0 ? totalHorasEquipamento / totalOsEquipamento : null,
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

  tituloPrincipalExportacao(modo: RelatorioOsModo = this.modoRelatorio): string {
    const m = this.modosRelatorio.find((x) => x.value === modo);
    return `Relatório de ordens de serviço — ${m?.label ?? modo}`;
  }

  textoFiltroStatusExportacao(modo: RelatorioOsModo = this.modoRelatorio): string {
    const m = this.modosRelatorio.find((x) => x.value === modo);
    return `Tipo de relatório: ${m?.label ?? modo}`;
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

  /**
   * Converte horas decimais em texto legível para PDF (ex.: 1,25 → "1h15min", 0,02 → "1min").
   */
  formatarHorasDuracaoPdf(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n) || n < 0) return '—';
    const totalMinutes = Math.round(n * 60);
    if (totalMinutes === 0) return '0h';
    const h = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    if (h === 0) return `${min}min`;
    if (min === 0) return `${h}h`;
    return `${h}h${min}min`;
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

  /**
   * Captura modo, período e agregados no instante do pedido de exportação (antes de `await import`),
   * para o ficheiro coincidir com o relatório visível mesmo se a UI mudar durante o carregamento da biblioteca.
   */
  private snapshotParaExport(): {
    modo: RelatorioOsModo;
    dataInicio: string;
    dataFim: string;
    resumo: ResumoProdutividadeGlobal;
    mediaEsperaPecas: MediaEsperaPecasResultado | null;
    agregados: TecnicoProdutividadeAgg[];
    agregadosEquipamento: EquipamentoAbertasAgg[];
  } {
    return {
      modo: this.modoRelatorio,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      resumo: { ...this.resumo },
      mediaEsperaPecas: this.mediaEsperaPecas ? { ...this.mediaEsperaPecas } : null,
      agregados: this.agregados.map((a) => ({ ...a, ordens: [...a.ordens] })),
      agregadosEquipamento: this.agregadosEquipamento.map((a) => ({ ...a, ordens: [...a.ordens] })),
    };
  }

  async exportarExcel(): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    this.cdr.markForCheck();
    const snap = this.snapshotParaExport();
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const gerado = this.formatarMomentoGeracao();

      switch (snap.modo) {
        case 'concluidas':
        case 'canceladas': {
          const { modo, resumo, agregados, dataInicio, dataFim } = snap;
          const mediaGeralNum =
            resumo.mediaHorasPorOsGlobal != null && !Number.isNaN(resumo.mediaHorasPorOsGlobal)
              ? Number(resumo.mediaHorasPorOsGlobal.toFixed(2))
              : '—';
          const resumoAoa: (string | number)[][] = [
            [this.tituloPrincipalExportacao(modo)],
            [this.textoFiltroStatusExportacao(modo)],
            [`Gerado em: ${gerado}`],
            [`Período: ${dataInicio} a ${dataFim}`],
            [],
            ['Totais gerais (período)', '', '', ''],
            [
              'Ordens de serviço no período',
              resumo.totalOs,
              modo === 'concluidas' ? 'Horas líquidas (total)' : 'Tempo até cancelamento (total)',
              resumo.totalHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            ],
            ['Média geral h / ordem de serviço', mediaGeralNum, 'Técnicos com ordens no período', resumo.tecnicosComOs],
            [],
            ['Técnico', 'Ordens no período', 'Horas totais', 'Média h / ordem'],
            ...agregados.map((a) => [
              a.nomeExibicao,
              a.osConcluidas,
              a.horasTotais,
              a.mediaHorasPorOs != null ? Number(a.mediaHorasPorOs.toFixed(2)) : '—',
            ]),
          ];
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoAoa), 'Resumo por técnico');
          const detalheRows: Record<string, string | number>[] = [];
          for (const a of agregados) {
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
          break;
        }
        case 'abertas_equipamento': {
          const { resumo, agregadosEquipamento, dataInicio, dataFim, modo } = snap;
          const mediaGeralEquip =
            resumo.mediaHorasPorOsGlobal != null && !Number.isNaN(resumo.mediaHorasPorOsGlobal)
              ? Number(resumo.mediaHorasPorOsGlobal.toFixed(2))
              : '—';
          const aoa: (string | number)[][] = [
            [this.tituloPrincipalExportacao(modo)],
            [this.textoFiltroStatusExportacao(modo)],
            [
              'Apenas ordens de serviço «Concluídas» ou «Canceladas» são contabilizadas neste relatório.',
            ],
            [`Gerado em: ${gerado}`],
            [`Período: ${dataInicio} a ${dataFim}`],
            [],
            ['Ordens de serviço (concluídas ou canceladas) no período', resumo.totalOs],
            [
              'Horas contabilizadas (total)',
              resumo.totalHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            ],
            ['Média de horas por ordem de serviço', mediaGeralEquip],
            ['Equipamentos com ordens no período', resumo.tecnicosComOs],
            [],
            ['Equipamento', 'Quantidade de ordens de serviço', 'Média h / ordem de serviço'],
            ...agregadosEquipamento.map((a) => [
              a.nomeExibicao,
              a.quantidade,
              a.mediaHorasPorOrdemServico != null ? Number(a.mediaHorasPorOrdemServico.toFixed(2)) : '—',
            ]),
          ];
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Por equipamento');
          const rows: Record<string, string | number>[] = [];
          for (const a of agregadosEquipamento) {
            for (const o of a.ordens) {
              rows.push({
                Equipamento: a.nomeExibicao,
                'N.º ordem de serviço': o.numeroOrdemServico,
                Técnico: o.tecnicoNome ?? '—',
                Prioridade: this.prioridadeLabel(o.prioridadeOrdemServico),
                Status: this.statusLabel(o.statusOrdemServico),
                Abertura: this.formatarDataHora(dataAberturaOuCriacao(o)),
              });
            }
          }
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detalhe ordens por equipamento');
          break;
        }
        case 'tempo_espera_pecas': {
          const m = snap.mediaEsperaPecas;
          const { dataInicio, dataFim, modo } = snap;
          const aoa: (string | number)[][] = [
            [this.tituloPrincipalExportacao(modo)],
            [this.textoFiltroStatusExportacao(modo)],
            [`Gerado em: ${gerado}`],
            [`Período: ${dataInicio} a ${dataFim}`],
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
          break;
        }
        default: {
          const { modo, dataInicio, dataFim } = snap;
          XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.aoa_to_sheet([
              [this.tituloPrincipalExportacao(modo)],
              [this.textoFiltroStatusExportacao(modo)],
              [`Período: ${dataInicio} a ${dataFim}`],
              [],
              [`Modo de relatório não suportado na exportação: ${String(modo)}`],
            ]),
            'Relatório',
          );
        }
      }

      const nome = `relatorio-os_${snap.modo}_${snap.dataInicio}_${snap.dataFim}.xlsx`;
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
    const snap = this.snapshotParaExport();
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
      const { modo, dataInicio, dataFim } = snap;
      doc.setFontSize(16);
      doc.text(this.tituloPrincipalExportacao(modo), 40, yHead);
      yHead += 22;
      doc.setFontSize(10);
      doc.text(this.textoFiltroStatusExportacao(modo), 40, yHead);
      yHead += lineH;
      doc.text(`Período: ${dataInicio} a ${dataFim}`, 40, yHead);
      yHead += lineH;
      doc.text(`Gerado em: ${geradoPdf}`, 40, yHead);
      yHead += lineH + 8;

      switch (snap.modo) {
        case 'concluidas':
        case 'canceladas': {
          const { resumo, agregados } = snap;
          const mediaGeralPdf = this.formatarHorasDuracaoPdf(resumo.mediaHorasPorOsGlobal);
          const totaisLinha = `Totais: ${resumo.totalOs} ordens de serviço | Total: ${this.formatarHorasDuracaoPdf(resumo.totalHoras)} | Média por ordem: ${mediaGeralPdf} | ${resumo.tecnicosComOs} técnico(s)`;
          const totaisLines = doc.splitTextToSize(totaisLinha, 720);
          doc.text(totaisLines, 40, yHead);
          yHead += totaisLines.length * lineH + 12;

          autoTable(doc, {
            startY: yHead,
            head: [['Técnico', 'Ordens no período', 'Horas totais', 'Média h / ordem']],
            body: agregados.map((a) => [
              a.nomeExibicao,
              String(a.osConcluidas),
              this.formatarHorasDuracaoPdf(a.horasTotais),
              this.formatarHorasDuracaoPdf(a.mediaHorasPorOs),
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
          for (const a of agregados) {
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
                this.formatarHorasDuracaoPdf(this.horasRelatorio(o)),
                hAg != null ? this.formatarHorasDuracaoPdf(hAg) : '—',
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
          break;
        }
        case 'abertas_equipamento': {
          const { agregadosEquipamento } = snap;
          const avisoEquip =
            'Apenas ordens de serviço «Concluídas» ou «Canceladas» são contabilizadas neste relatório.';
          const avisoLines = doc.splitTextToSize(avisoEquip, 720);
          doc.text(avisoLines, 40, yHead);
          yHead += avisoLines.length * lineH + 8;
          autoTable(doc, {
            startY: yHead,
            head: [['Equipamento', 'Ordens (concl. ou cancel.)', 'Média h / ordem']],
            body: agregadosEquipamento.map((a) => [
              a.nomeExibicao,
              String(a.quantidade),
              a.mediaHorasPorOrdemServico != null ? this.formatarHorasDuracaoPdf(a.mediaHorasPorOrdemServico) : '—',
            ]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [103, 80, 164] },
          });
          break;
        }
        case 'tempo_espera_pecas': {
          const m = snap.mediaEsperaPecas;
          const linhas = [
            `Ordens no período (concluídas ou canceladas): ${m?.osNoUniverso ?? 0}`,
            `Ordens com tempo de espera registado (> 0 h): ${m?.osComEsperaRegistada ?? 0}`,
            `Média de horas em espera de peças (entre essas ordens): ${this.formatarHorasDuracaoPdf(m?.mediaHoras ?? null)}`,
          ];
          doc.text(linhas, 40, yHead);
          break;
        }
        default: {
          doc.text(`Modo de relatório não suportado na exportação: ${String(snap.modo)}`, 40, yHead);
        }
      }

      doc.save(`relatorio-os_${snap.modo}_${snap.dataInicio}_${snap.dataFim}.pdf`);
    } finally {
      this.ngZone.run(() => {
        this.exportando = false;
        this.cdr.markForCheck();
      });
    }
  }
}
