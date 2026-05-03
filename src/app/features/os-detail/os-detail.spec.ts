import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { OsDetail } from './os-detail';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';
import type { OrdemServico } from '../../core/models/ordem-servico.model';
import type { Equipamento } from '../../core/models/equipamento.model';
import type { Usuario } from '../../core/models/usuario.model';

describe('OsDetail', () => {
  let component: OsDetail;
  let fixture: ComponentFixture<OsDetail>;

  const mockEquipamento: Equipamento = {
    id: 'eq-ph',
    codigo: 'EQ-PH-088',
    nome: 'Prensa Hidráulica 400T',
    tipo: 'HIDRAULICO',
    localizacao: 'Linha 2',
    ativo: true,
    dataCriacao: '2024-01-01',
    dataAtualizacao: '2024-01-01',
  };

  const mockOs: OrdemServico = {
    idOrdemServico: 'os-1',
    numeroOrdemServico: 'OS241201-81',
    idEquipamento: 'eq-ph',
    tipoManutencao: 'CORRETIVA',
    prioridadeOrdemServico: 'CRITICA',
    statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
    descricaoFalha: 'Vazamento intermitente',
    idTecnico: 'tec1',
    tecnicoNome: 'João Silva',
    idSolicitante: 'sol1',
    solicitanteNome: 'Pedro Oliveira',
    aberturaEm: '2024-12-01T10:00:00.000Z',
    dataCriacao: '2024-12-01T10:00:00.000Z',
    dataAtualizacao: '2024-12-02T10:00:00.000Z',
    inicioEm: '2024-12-02T11:00:00.000Z',
  };

  const mockUsuarios: Usuario[] = [
    {
      idUsuario: 'sol1',
      nomeUsuario: 'Pedro Oliveira',
      emailUsuario: 'p@test',
      perfilUsuario: UserRole.SOLICITANTE,
      statusUsuario: true,
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    },
    {
      idUsuario: 'tec1',
      nomeUsuario: 'João Silva',
      emailUsuario: 'j@test',
      perfilUsuario: UserRole.TECNICO,
      statusUsuario: true,
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    },
    {
      idUsuario: 'tec2',
      nomeUsuario: 'Maria Costa',
      emailUsuario: 'm@test',
      perfilUsuario: UserRole.TECNICO,
      statusUsuario: true,
      dataCriacao: '2024-01-01',
      dataAtualizacao: '2024-01-01',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'os-1' : null) } },
          },
        },
        {
          provide: OrdemServicoService,
          useValue: {
            buscarPorId: () => of(mockOs),
            atualizar: () => of(mockOs),
          },
        },
        { provide: UsuarioService, useValue: { listar: () => of(mockUsuarios) } },
        { provide: EquipamentoService, useValue: { listar: () => of([mockEquipamento]) } },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ idUsuario: 'adm', perfilUsuario: UserRole.ADMIN }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OsDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir número da OS no formato OSyymmdd-nn', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS241201-81');
  });

  it('deve exibir tipo e prioridade', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Manutenção Corretiva');
    expect(compiled.textContent).toContain('Crítica');
  });

  it('deve exibir equipamento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Prensa Hidráulica 400T');
    expect(compiled.textContent).toContain('EQ-PH-088');
  });

  it('deve exibir solicitante', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pedro Oliveira');
  });

  it('deve exibir descrição da falha', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vazamento intermitente');
  });

  it('deve montar timeline com 3 eventos (criação, técnico, início)', () => {
    expect(component.timelineEvents.length).toBe(3);
  });

  it('deve exibir evento de início da manutenção', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Início da Manutenção');
  });

  it('deve ter select de técnicos sem opção Sem atribuição (só técnicos ativos)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select');
    expect(select).toBeTruthy();
    expect(select?.options.length).toBe(2);
    expect(compiled.textContent).not.toContain('Sem atribuição');
  });

  it('não deve permitir atualizar técnico sem alteração (botão desativado)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const btn = Array.from(compiled.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Atualizar técnico responsável'),
    );
    expect(btn?.disabled).toBe(true);
    expect(component.podeAtualizarTecnico).toBe(false);
  });

  it('deve ter botão de atualizar técnico', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Atualizar técnico responsável');
  });

  it('deve ter seção de fechamento ativa quando EM_ANDAMENTO', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Fechamento');
    expect(compiled.textContent).toContain('Serviço realizado');
  });

  it('deve ter botão de encerrar ordem de serviço', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Encerrar ordem de serviço');
  });

  it('como admin em EM_ANDAMENTO exibe Aguardar Peça ativo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const btn = Array.from(compiled.querySelectorAll('button')).find((b) =>
      b.textContent?.trim().includes('Aguardar Peça'),
    );
    expect(btn).toBeTruthy();
    expect(btn?.disabled).toBe(false);
  });

  it('como técnico não atribuído exibe Aguardar Peça desativado', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OsDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'os-1' : null) } },
          },
        },
        {
          provide: OrdemServicoService,
          useValue: {
            buscarPorId: () => of(mockOs),
            atualizar: () => of(mockOs),
          },
        },
        { provide: UsuarioService, useValue: { listar: () => of(mockUsuarios) } },
        { provide: EquipamentoService, useValue: { listar: () => of([mockEquipamento]) } },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ idUsuario: 'tec2', perfilUsuario: UserRole.TECNICO, nomeUsuario: 'Maria' }),
          },
        },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(OsDetail);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();

    const compiled = f.nativeElement as HTMLElement;
    const btn = Array.from(compiled.querySelectorAll('button')).find((b) =>
      b.textContent?.trim().includes('Aguardar Peça'),
    );
    expect(btn?.disabled).toBe(true);
  });
});
