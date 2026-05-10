import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { OrdemServico, dataAberturaOuCriacao } from '../../core/models/ordem-servico.model';
import { UserRole } from '../../core/enums/roles.enum';
import { OrdemStatus, STATUS_LABELS } from '../../core/enums/status.enum';
import { statusOrdemBadgeColorClasses } from '../../core/utils/status-badge.util';
import { OsAcoesLinhaComponent } from '../../components/os-acoes-linha/os-acoes-linha';
import { DialogComponent, DialogBotao } from '../../components/dialog/dialog.component';

export interface DiaAtividade {
  dia: string;
  rotuloData: string;
  valor: number;
  ehHoje: boolean;
  alturaPercentual: number;
}

export interface DisponibilidadeTecnico {
  idTecnico: string;
  tecnicoNome: string;
  baixa: number;
  media: number;
  alta: number;
  critica: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OsAcoesLinhaComponent, DialogComponent],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private ordemService = inject(OrdemServicoService);
  private usuarioService = inject(UsuarioService);
  private equipamentoService = inject(EquipamentoService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  tecnicoNomeMap = new Map<string, string>();
  equipamentoNomeMap = new Map<string, string>();

  osAbertasHoje = 0;
  osEmAndamento = 0;
  osCriticas = 0;
  osConcluidas = 0;
  canceladas = 0;
  eficiencia = '--';
  tempoMedioConclusao = '--';
  osAguardandopeca = 0;

  filtroAtivo: string | null = null;
  readonly filtroLabels: Record<string, string> = {
    ABERTO: 'Abertas',
    EM_ANDAMENTO: 'Em Andamento',
    CRITICA: 'Alta Prioridade',
    CONCLUIDO: 'Concluídas',
    CANCELADO: 'Canceladas',
    AGUARDANDO_PECA: 'Aguardando Peça',
  };

  ordens: OrdemServico[] = [];
  carregando = true;
  erro: string | null = null;

  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.carregando = true;
    this.erro = null;
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar(),
      equipamentos: this.equipamentoService.listar(),
    }).subscribe({
      next: ({ ordens: dados, usuarios, equipamentos }) => {
        this.equipamentoNomeMap.clear();
        equipamentos.forEach((e) => this.equipamentoNomeMap.set(e.id, e.nome));

        this.tecnicoNomeMap.clear();
        usuarios
          .filter((u) => u.perfilUsuario === UserRole.TECNICO)
          .forEach((u) => this.tecnicoNomeMap.set(u.idUsuario, u.nomeUsuario));

        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        this.ordens = dados.filter((os) => {
          const ref = dataAberturaOuCriacao(os);
          if (!ref) return false;
          const t = new Date(ref).getTime();
          return !Number.isNaN(t) && t >= trintaDiasAtras.getTime();
        });

        this.osAbertasHoje = this.ordens.filter((o) => o.statusOrdemServico === OrdemStatus.ABERTO).length;
        this.osEmAndamento = this.ordens.filter((o) => o.statusOrdemServico === OrdemStatus.EM_ANDAMENTO).length;
        this.osCriticas = this.ordens.filter(
          (o) =>
            o.statusOrdemServico === OrdemStatus.ABERTO && o.prioridadeOrdemServico === 'CRITICA'
        ).length;
        this.osConcluidas = this.ordens.filter((o) => o.statusOrdemServico === OrdemStatus.CONCLUIDO).length;
        this.canceladas = this.ordens.filter((o) => o.statusOrdemServico === OrdemStatus.CANCELADO).length;
        this.osAguardandopeca = this.ordens.filter((o) => o.statusOrdemServico === OrdemStatus.AGUARDANDO_PECA)
          .length;

        const total = this.ordens.length;
        this.eficiencia = total > 0 ? Math.round((this.osConcluidas / total) * 100) + '%' : '--';

        const concluidas = this.ordens.filter(
          (o) => o.statusOrdemServico === OrdemStatus.CONCLUIDO && o.conclusaoEm
        );
        if (concluidas.length > 0) {
          const totalHoras = concluidas.reduce((acc, os) => {
            const abRef = dataAberturaOuCriacao(os);
            if (!abRef || !os.conclusaoEm) return acc;
            const abertura = new Date(abRef).getTime();
            const conclusao = new Date(os.conclusaoEm).getTime();
            if (Number.isNaN(abertura) || Number.isNaN(conclusao)) return acc;
            const horas = (conclusao - abertura) / (1000 * 60 * 60);
            return acc + horas;
          }, 0);
          const mediaHoras = Math.round(totalHoras / concluidas.length);
          this.tempoMedioConclusao = mediaHoras + 'h';
        } else {
          this.tempoMedioConclusao = '--';
        }

        this.calcularAtividadeSemanal(this.ordens);

        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar as ordens de serviço.';
        this.carregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onDadosOsAlterados(mensagemSucesso?: string): void {
    this.carregarDados();
    if (mensagemSucesso !== undefined && mensagemSucesso !== '') {
      this.dialogTitulo = 'Sucesso';
      this.dialogMensagem = mensagemSucesso;
      this.dialogTipo = 'info';
      this.dialogBotoes = [{ label: 'OK', acao: 'ok', estilo: 'primario' }];
      this.dialogVisivel = true;
    }
  }

  onDashboardDialogAcao(_acao?: string): void {
    this.dialogVisivel = false;
  }

  atividadeSemanal: DiaAtividade[] = [];
  escalaMaxY = 1;

  get ticksEixoY(): number[] {
    const max = Math.max(this.escalaMaxY, 1);
    const step = Math.max(1, Math.ceil(max / 4));
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = top; v >= 0; v -= step) {
      ticks.push(v);
    }
    return ticks;
  }

  private calcularAtividadeSemanal(ordens: OrdemServico[]): void {
    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    const buckets: DiaAtividade[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const data = new Date(hoje);
      data.setHours(0, 0, 0, 0);
      data.setDate(hoje.getDate() - offset);
      const start = data.getTime();

      const count = ordens.filter((os) => {
        const ref = dataAberturaOuCriacao(os);
        if (!ref) return false;
        const d = new Date(ref);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === start;
      }).length;

      const dd = String(data.getDate()).padStart(2, '0');
      const mm = String(data.getMonth() + 1).padStart(2, '0');

      buckets.push({
        dia: diasNomes[data.getDay()],
        rotuloData: `${dd}/${mm}`,
        valor: count,
        ehHoje: offset === 0,
        alturaPercentual: 0,
      });
    }

    const maxValor = Math.max(...buckets.map((b) => b.valor), 0);
    const step = Math.max(1, Math.ceil(Math.max(maxValor, 1) / 4));
    this.escalaMaxY = Math.ceil(Math.max(maxValor, 1) / step) * step;

    this.atividadeSemanal = buckets.map((b) => ({
      ...b,
      alturaPercentual: this.escalaMaxY > 0 ? (b.valor / this.escalaMaxY) * 100 : 0,
    }));
  }

  getStatusClass(status: OrdemStatus): string {
    return `inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase ${statusOrdemBadgeColorClasses(status)}`;
  }

  getStatusLabel(status: OrdemStatus): string {
    return STATUS_LABELS[status];
  }

  getEquipamentoExibicao(os: OrdemServico): string {
    const nome =
      this.equipamentoNomeMap.get(os.idEquipamento) ?? os.equipamentoNome?.trim();
    return nome && nome !== '' ? nome : '—';
  }

  getDescricaoOrdemExibicao(os: OrdemServico): string {
    const d =
      os.descricaoOrdemServico?.trim() ||
      os.descricaoServico?.trim() ||
      os.descricaoFalha?.trim();
    return d && d !== '' ? d : '—';
  }

  onVerTodas(): void {
    this.selecionarFiltro(null);
  }

  selecionarFiltro(filtro: string | null): void {
    this.filtroAtivo = this.filtroAtivo === filtro ? null : filtro;
  }

  get ordensFiltradas(): OrdemServico[] {
    if (!this.filtroAtivo) return this.ordens;
    if (this.filtroAtivo === 'CRITICA') {
      return this.ordens.filter(
        (o) =>
          o.statusOrdemServico === OrdemStatus.ABERTO && o.prioridadeOrdemServico === 'CRITICA'
      );
    }
    return this.ordens.filter((o) => o.statusOrdemServico === this.filtroAtivo as OrdemStatus);
  }

  onVerDetalhesOrdem(id: string): void {
    void this.router.navigate(['/app/ordens', id]);
  }

  gerarRelatorio(): void {
    console.log('Gerar relatório PDF');
  }

  criarOS(): void {
    console.log('Criar nova OS');
  }

  getTecnicoNome(idTecnico?: string): string {
    if (!idTecnico) return '---';
    return this.tecnicoNomeMap.get(idTecnico) ?? '---';
  }

  get disponibilidadeTecnicos(): DisponibilidadeTecnico[] {
    const ativas = this.ordens.filter(
      (o) =>
        o.statusOrdemServico === OrdemStatus.ABERTO ||
        o.statusOrdemServico === OrdemStatus.EM_ANDAMENTO
    );

    const mapa = new Map<string, DisponibilidadeTecnico>();

    for (const os of ativas) {
      if (!os.idTecnico) continue;
      const nome =
        this.tecnicoNomeMap.get(os.idTecnico) ?? `Técnico ${os.idTecnico.substring(0, 8)}`;

      if (!mapa.has(os.idTecnico)) {
        mapa.set(os.idTecnico, {
          idTecnico: os.idTecnico,
          tecnicoNome: nome,
          baixa: 0,
          media: 0,
          alta: 0,
          critica: 0,
        });
      }

      const entrada = mapa.get(os.idTecnico)!;
      switch (os.prioridadeOrdemServico) {
        case 'BAIXA':
          entrada.baixa++;
          break;
        case 'MEDIA':
          entrada.media++;
          break;
        case 'ALTA':
          entrada.alta++;
          break;
        case 'CRITICA':
          entrada.critica++;
          break;
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.tecnicoNome.localeCompare(b.tecnicoNome));
  }
}
