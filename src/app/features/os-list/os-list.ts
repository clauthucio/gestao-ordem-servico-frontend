import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ModalContainerComponent } from '../../components/modal-container/modal-container';
import { OsFormComponent } from '../../components/os-form/os-form';
import { UserRole } from '../../core/enums/roles.enum';
import { OrdemStatus } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';

export type PrioridadeOS = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusOS = 'aberto' | 'execucao' | 'pendente' | 'finalizada' | 'cancelada';

export interface OrdemServicoTabela {
  id: string;
  numero: string;
  equipamento: string;
  tipo: string;
  prioridade: PrioridadeOS;
  status: StatusOS;
  tecnico: string | null;
  dataAbertura: string;
}

@Component({
  selector: 'app-os-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ModalContainerComponent, OsFormComponent],
  templateUrl: './os-list.html'
})
export class OsList implements OnInit {
  private readonly ordemService = inject(OrdemServicoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  titulo = 'Inventário de Ordens de Serviço';
  subtitulo = 'Gerencie e monitore todas as solicitações de manutenção do polo.';

  busca = '';
  filtroStatus = 'todos';
  filtroPrioridade = 'todas';
  carregando = true;
  erro: string | null = null;
  showModal = false;

  paginaAtual = 1;
  itensPorPagina = 10;

  tecnicoNomeMap = new Map<string, string>();
  ordens: OrdemServicoTabela[] = [];

  ngOnInit(): void {
    console.log('[OsList] ngOnInit chamado');
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar(),
    }).subscribe({
      next: ({ ordens, usuarios }) => {
        console.log('[OsList] next disparado, ordens=', ordens.length, 'usuarios=', usuarios.length);
        try {
          this.tecnicoNomeMap.clear();
          usuarios
            .filter((usuario) => usuario.perfilUsuario === UserRole.TECNICO)
            .forEach((usuario) => this.tecnicoNomeMap.set(usuario.idUsuario, usuario.nomeUsuario));

          this.ordens = ordens.map((ordem) => this.mapearOrdem(ordem));
          this.paginaAtual = 1;
          this.carregando = false;
          this.cdr.markForCheck();
        } catch (err) {
          console.error('[OsList] Erro ao mapear ordens:', err);
          this.erro = 'Erro ao processar os dados das ordens de serviço.';
          this.carregando = false;
        }
      },
      error: (error) => {
        console.error('[OsList] Erro ao carregar ordens:', error);
        this.erro = 'Não foi possível carregar as ordens de serviço.';
        this.carregando = false;
      },
    });
  }

  get ordensFiltradas(): OrdemServicoTabela[] {
    const termo = this.busca.trim().toLocaleLowerCase();

    return this.ordens.filter((ordem) => {
      const atendeBusca = !termo || [
        ordem.numero,
        ordem.equipamento,
        ordem.tipo,
        ordem.tecnico ?? '',
      ].some((valor) => valor.toLocaleLowerCase().includes(termo));

      const atendeStatus = this.filtroStatus === 'todos' || ordem.status === this.filtroStatus;
      const atendePrioridade = this.filtroPrioridade === 'todas' || ordem.prioridade === this.filtroPrioridade;

      return atendeBusca && atendeStatus && atendePrioridade;
    });
  }

  get ordensPaginadas(): OrdemServicoTabela[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.ordensFiltradas.slice(inicio, inicio + this.itensPorPagina);
  }

  get totalItens(): number {
    return this.ordensFiltradas.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalItens / this.itensPorPagina));
  }

  get paginaInicial(): number {
    if (this.totalItens === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get paginaFinal(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  get paginasVisiveis(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, indice) => indice + 1).slice(0, 3);
  }

  private mapearOrdem(ordem: OrdemServico): OrdemServicoTabela {
    return {
      id: ordem.idOrdemServico,
      numero: ordem.numeroOrdemServico,
      equipamento: ordem.equipamentoNome || ordem.descricaoFalha || 'N/D',
      tipo: ordem.tipoManutencao ? this.formatarTipo(ordem.tipoManutencao) : 'N/D',
      prioridade: ordem.prioridadeOrdemServico ? this.mapearPrioridade(ordem.prioridadeOrdemServico) : 'baixa',
      status: ordem.statusOrdemServico ? this.mapearStatus(ordem.statusOrdemServico) : 'aberto',
      tecnico: ordem.idTecnico ? this.tecnicoNomeMap.get(ordem.idTecnico) ?? ordem.tecnicoNome ?? null : null,
      dataAbertura: ordem.aberturaEm ? this.formatarData(ordem.aberturaEm) : 'N/D',
    };
  }

  private mapearPrioridade(prioridade: OrdemServico['prioridadeOrdemServico']): PrioridadeOS {
    return prioridade.toLocaleLowerCase() as PrioridadeOS;
  }

  private mapearStatus(status: OrdemStatus): StatusOS {
    const mapa: Record<OrdemStatus, StatusOS> = {
      [OrdemStatus.ABERTO]: 'aberto',
      [OrdemStatus.EM_ANDAMENTO]: 'execucao',
      [OrdemStatus.AGUARDANDO_PECA]: 'pendente',
      [OrdemStatus.CONCLUIDO]: 'finalizada',
      [OrdemStatus.CANCELADO]: 'cancelada',
    };

    return mapa[status];
  }

  private formatarTipo(tipo: OrdemServico['tipoManutencao']): string {
    return `${tipo.charAt(0)}${tipo.slice(1).toLocaleLowerCase()}`;
  }

  private formatarData(data: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(data));
  }

  getPrioridadeClass(prioridade: PrioridadeOS): string {
    const map: Record<PrioridadeOS, string> = {
      baixa: 'bg-blue-100 text-blue-700',
      media: 'bg-green-100 text-green-700',
      alta: 'bg-yellow-100 text-yellow-700',
      critica: 'bg-red-100 text-red-700'
    };
    return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${map[prioridade]}`;
  }

  getPrioridadeLabel(prioridade: PrioridadeOS): string {
    const map: Record<PrioridadeOS, string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      critica: 'Crítica'
    };
    return map[prioridade];
  }

  getStatusClass(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberto: 'bg-on-surface-variant/10 text-on-surface-variant',
      execucao: 'bg-secondary-container text-on-secondary-container',
      pendente: 'bg-error-container text-on-error-container',
      finalizada: 'bg-tertiary/10 text-tertiary',
      cancelada: 'bg-error/10 text-error'
    };
    return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${map[status]}`;
  }

  getStatusLabel(status: StatusOS): string {
    const map: Record<StatusOS, string> = {
      aberto: 'Em Aberto',
      execucao: 'Em Execução',
      pendente: 'Pendente',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada'
    };
    return map[status];
  }

  onNovaOS(): void {
    this.showModal = true;
  }

  onModalFechar(): void {
    this.showModal = false;
  }

  onOsSalva(): void {
    this.showModal = false;
    this.recarregar();
  }

  private recarregar(): void {
    this.carregando = true;
    this.erro = null;
    forkJoin({
      ordens: this.ordemService.listar(),
      usuarios: this.usuarioService.listar(),
    }).subscribe({
      next: ({ ordens, usuarios }) => {
        this.tecnicoNomeMap.clear();
        usuarios
          .filter((u) => u.perfilUsuario === UserRole.TECNICO)
          .forEach((u) => this.tecnicoNomeMap.set(u.idUsuario, u.nomeUsuario));
        this.ordens = ordens.map((o) => this.mapearOrdem(o));
        this.paginaAtual = 1;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[OsList] Erro ao recarregar ordens:', err);
        this.erro = 'Não foi possível recarregar as ordens de serviço.';
        this.carregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onVerDetalhes(id: string): void {
    this.router.navigate(['/app/ordens', id]);
  }

  onEditar(id: string): void {
    this.router.navigate(['/app/ordens', id, 'atualizar']);
  }

  onPaginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  onProximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  onIrParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;
  }
}
