import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrdemStatus } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import type { OrdemServico } from '../../core/models/ordem-servico.model';
import { RelatoriosOs } from './relatorios-os';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/enums/roles.enum';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function osConcluidaHoje(horas: number): OrdemServico {
  const hoje = new Date();
  const conclusao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 14, 0, 0);
  return {
    idOrdemServico: 'os-1',
    numeroOrdemServico: 'N-100',
    idEquipamento: 'eq',
    tipoManutencao: 'CORRETIVA',
    prioridadeOrdemServico: 'MEDIA',
    statusOrdemServico: OrdemStatus.CONCLUIDO,
    descricaoFalha: 'Teste',
    aberturaEm: '2024-01-01',
    dataCriacao: '2024-01-01',
    dataAtualizacao: conclusao.toISOString(),
    conclusaoEm: conclusao.toISOString(),
    idTecnico: 'tec-1',
    tecnicoNome: 'Técnico Um',
    horasTrabalhadas: horas,
  };
}

describe('RelatoriosOs', () => {
  let component: RelatoriosOs;
  let fixture: ComponentFixture<RelatoriosOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatoriosOs],
      providers: [
        { provide: OrdemServicoService, useValue: { listar: () => of([osConcluidaHoje(5)]) } },
        { provide: UsuarioService, useValue: { listar: () => of([]) } },
        {
          provide: AuthService,
          useValue: {
            getCurrentUserRole: () => UserRole.SUPERVISOR_DE_MANUTENCAO,
            getCurrentUser: () => ({ idUsuario: 's', perfilUsuario: UserRole.SUPERVISOR_DE_MANUTENCAO }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título do relatório', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Relatórios de ordens de serviço');
  });

  it('modo padrão é ordens de serviço concluídas', () => {
    expect(component.modoRelatorio).toBe('concluidas');
  });

  it('limparFiltros repõe modo e janela de datas', () => {
    component.modoRelatorio = 'canceladas';
    component.dataInicio = '2000-01-01';
    component.limparFiltros();
    expect(component.modoRelatorio).toBe('concluidas');
    const hoje = new Date();
    expect(component.dataFim).toBe(ymd(hoje));
  });

  it('tituloPrincipalExportacao e textoFiltroStatusExportacao refletem o modo', () => {
    expect(component.tituloPrincipalExportacao()).toContain('concluí');
    expect(component.textoFiltroStatusExportacao()).toContain('Ordens de serviço concluídas');
  });

  it('deve usar período padrão de 7 dias até hoje nas datas', () => {
    const hoje = new Date();
    const esperadoFim = ymd(hoje);
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    ini.setDate(ini.getDate() - 7);
    const esperadoIni = ymd(ini);
    expect(component.dataFim).toBe(esperadoFim);
    expect(component.dataInicio).toBe(esperadoIni);
  });

  it('deve recalcular resumo ao alterar período (aoAlterarFiltro)', () => {
    expect(component.resumo.totalOs).toBe(1);
    expect(component.resumo.totalHoras).toBe(5);
    component.dataInicio = '2000-01-01';
    component.dataFim = '2000-12-31';
    component.aoAlterarFiltro();
    expect(component.resumo.totalOs).toBe(0);
    const hoje = new Date();
    const fim = ymd(hoje);
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    ini.setDate(ini.getDate() - 7);
    component.dataInicio = ymd(ini);
    component.dataFim = fim;
    component.aoAlterarFiltro();
    expect(component.resumo.totalOs).toBe(1);
  });

  it('modo tempo de espera calcula média com ordens no universo', () => {
    component.modoRelatorio = 'tempo_espera_pecas';
    component.aoAlterarModoRelatorio();
    expect(component.mediaEsperaPecas?.osNoUniverso).toBe(1);
    expect(component.mediaEsperaPecas?.osComEsperaRegistada).toBe(0);
  });

  it('aoAlterarFiltro com data inicial maior que final define erro e não atualiza totais para intervalo inválido', () => {
    const totalAntes = component.resumo.totalOs;
    component.dataInicio = '2030-01-01';
    component.dataFim = '2020-01-01';
    component.aoAlterarFiltro();
    expect(component.erro).toContain('data inicial');
    expect(component.resumo.totalOs).toBe(totalAntes);
  });
});
