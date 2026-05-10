import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OsList } from './os-list';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdemServico } from '../../core/models/ordem-servico.model';
import { EquipamentoListItem } from '../../core/models/equipamento.model';
import { Usuario } from '../../core/models/usuario.model';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';
import { compararNumeroOrdemServico } from '../../core/utils/numero-ordem-servico.util';

describe('OsList', () => {
  let component: OsList;
  let fixture: ComponentFixture<OsList>;

  const equipamentoInjetora: EquipamentoListItem = {
    id: 'eq-inj',
    codigo: 'EQ-001',
    nome: 'Injetora 04 - Setor A',
    tipo: 'MECANICO',
    localizacao: 'A',
    ativo: true,
    dataCriacao: '2024-01-01',
    dataAtualizacao: '2024-01-01',
    ordensAbertasCount: 0,
    nomeUsuarioCriacao: null,
    nomeUsuarioUltimaModificacao: null,
  };

  const equipamentoOutro: EquipamentoListItem = {
    id: 'eq-out',
    codigo: 'EQ-002',
    nome: 'Outro equipamento',
    tipo: 'ELETRICO',
    localizacao: 'B',
    ativo: true,
    dataCriacao: '2024-01-01',
    dataAtualizacao: '2024-01-01',
    ordensAbertasCount: 0,
    nomeUsuarioCriacao: null,
    nomeUsuarioUltimaModificacao: null,
  };

  const usuariosMock: Usuario[] = [
    {
      idUsuario: 'tec1',
      nomeUsuario: 'Carlos Mendes',
      emailUsuario: 'c@test',
      perfilUsuario: UserRole.TECNICO,
      statusUsuario: true,
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    },
    {
      idUsuario: 'tec2',
      nomeUsuario: 'Maria Oliveira',
      emailUsuario: 'm@test',
      perfilUsuario: UserRole.TECNICO,
      statusUsuario: true,
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    },
  ];

  function osBase(over: Partial<OrdemServico> & Pick<OrdemServico, 'idOrdemServico' | 'numeroOrdemServico'>): OrdemServico {
    return {
      idOrdemServico: over.idOrdemServico,
      numeroOrdemServico: over.numeroOrdemServico,
      idEquipamento: over.idEquipamento ?? 'eq-inj',
      tipoManutencao: over.tipoManutencao ?? 'CORRETIVA',
      prioridadeOrdemServico: over.prioridadeOrdemServico ?? 'MEDIA',
      statusOrdemServico: over.statusOrdemServico ?? OrdemStatus.ABERTO,
      descricaoFalha: over.descricaoFalha ?? 'Falha',
      aberturaEm: over.aberturaEm ?? '2024-06-01T10:00:00.000Z',
      dataCriacao: over.dataCriacao ?? '2024-06-01T10:00:00.000Z',
      dataAtualizacao: over.dataAtualizacao ?? '2024-06-01T10:00:00.000Z',
      idTecnico: over.idTecnico,
      tecnicoNome: over.tecnicoNome,
    };
  }

  /** Ordem decrescente por abertura: OS mais recente no topo (formato OSyymmdd-nn) */
  const ordensMock: OrdemServico[] = [
    osBase({
      idOrdemServico: 'os-891',
      numeroOrdemServico: 'OS241220-01',
      prioridadeOrdemServico: 'CRITICA',
      statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
      idTecnico: 'tec1',
      aberturaEm: '2024-12-20T15:00:00.000Z',
    }),
    osBase({
      idOrdemServico: 'os-888',
      numeroOrdemServico: 'OS241110-02',
      prioridadeOrdemServico: 'BAIXA',
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      idTecnico: 'tec2',
      aberturaEm: '2024-11-10T12:00:00.000Z',
    }),
    osBase({
      idOrdemServico: 'os-875',
      numeroOrdemServico: 'OS241005-03',
      prioridadeOrdemServico: 'MEDIA',
      statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
      idTecnico: 'tec1',
      aberturaEm: '2024-10-05T09:00:00.000Z',
    }),
    osBase({
      idOrdemServico: 'os-862',
      numeroOrdemServico: 'OS240801-04',
      idEquipamento: 'eq-out',
      prioridadeOrdemServico: 'ALTA',
      statusOrdemServico: OrdemStatus.AGUARDANDO_PECA,
      aberturaEm: '2024-08-01T08:00:00.000Z',
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsList],
      providers: [
        provideRouter([]),
        { provide: OrdemServicoService, useValue: { listar: () => of(ordensMock) } },
        {
          provide: EquipamentoService,
          useValue: { listar: () => of([equipamentoInjetora, equipamentoOutro]) },
        },
        { provide: UsuarioService, useValue: { listar: () => of(usuariosMock) } },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ idUsuario: 'admin', perfilUsuario: UserRole.ADMIN }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Inventário de Ordens de Serviço');
  });

  it('deve ter FAB nova OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector('[aria-label="Nova Ordem de Serviço"]');
    expect(fab).toBeTruthy();
  });

  it('deve ter campo de busca', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="busca"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('placeholder')).toContain('Pesquisar');
  });

  it('deve ter filtros de status e prioridade', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Status: Todos');
    expect(compiled.textContent).toContain('Prioridade: Todas');
  });

  it('deve ter botão Limpar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Limpar');
  });

  it('deve renderizar tabela com 4 ordens', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr.border-b');
    expect(rows.length).toBe(4);
  });

  it('deve exibir OS mais recente (crítica) em primeiro lugar com ordenação padrão', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstDataRow = compiled.querySelector('tbody tr.border-b');
    expect(firstDataRow?.textContent).toContain('OS241220-01');
    expect(compiled.textContent).toContain('Injetora 04 - Setor A');
    expect(compiled.textContent).toContain('Crítica');
  });

  it('deve exibir OS finalizada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS241110-02');
    expect(compiled.textContent).toContain('Finalizada');
    expect(compiled.textContent).toContain('Maria Oliveira');
  });

  it('deve exibir OS em execução', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS241005-03');
    expect(compiled.textContent).toContain('Em Execução');
    expect(compiled.textContent).toContain('Carlos Mendes');
  });

  it('deve exibir OS pendente sem técnico', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS240801-04');
    expect(compiled.textContent).toContain('Pendente');
    expect(compiled.textContent).toContain('Não Atribuído');
  });

  it('deve ter menu de ações (more_vert) por linha', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const menus = compiled.querySelectorAll('button[title="Ações"]');
    expect(menus.length).toBe(4);
  });

  it('deve ter paginação com total correto', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mostrando 1-4 de 4 Ordens');
  });

  it('deve ter botões de navegação de página', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('.border-t');
    const botoes = footer?.querySelectorAll('button') ?? [];
    expect(botoes.length).toBeGreaterThanOrEqual(3);
  });

  it('compararNumeroOrdemServico ordena OSyymmdd-nn por data e sequencial', () => {
    const nums = ['OS241220-01', 'OS240801-04', 'OS241110-02', 'OS241005-03'];
    const asc = [...nums].sort(compararNumeroOrdemServico);
    expect(asc).toEqual(['OS240801-04', 'OS241005-03', 'OS241110-02', 'OS241220-01']);
    const desc = [...nums].sort((a, b) => compararNumeroOrdemServico(b, a));
    expect(desc).toEqual(['OS241220-01', 'OS241110-02', 'OS241005-03', 'OS240801-04']);
  });

  it('limparFiltrosEOrdenacao restaura busca, filtros e ordenação padrão', () => {
    component.busca = 'nada';
    component.filtroStatus = 'aberto';
    component.ordenacaoColuna = 'numero';
    component.ordenacaoDirecao = 'asc';
    component.limparFiltrosEOrdenacao();
    expect(component.busca).toBe('');
    expect(component.filtroStatus).toBe('todos');
    expect(component.filtroPrioridade).toBe('todas');
    expect(component.ordenacaoColuna).toBe('abertura');
    expect(component.ordenacaoDirecao).toBe('desc');
  });

  it('deve incluir OS finalizada (CONCLUIDO) na lista para menu somente com Ver detalhes', () => {
    const osFinal = component.ordens.find((o) => o.statusOrdemServico === OrdemStatus.CONCLUIDO);
    expect(osFinal?.numero).toBe('OS241110-02');
    expect(osFinal?.statusOrdemServico).toBe(OrdemStatus.CONCLUIDO);
  });

  it('deve abrir diálogo de sucesso quando onOrdensMutadas recebe mensagem (ex.: após editar OS)', () => {
    component.onOrdensMutadas('Ordem de serviço atualizada com sucesso.');
    fixture.detectChanges();
    expect(component.dialogVisivel).toBe(true);
    expect(component.dialogTitulo).toBe('Sucesso');
    expect(component.dialogMensagem).toBe('Ordem de serviço atualizada com sucesso.');
  });
});
