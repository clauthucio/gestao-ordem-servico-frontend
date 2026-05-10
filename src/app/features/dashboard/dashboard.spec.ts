import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { OrdemStatus } from '../../core/enums/status.enum';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: OrdemServicoService, useValue: { listar: () => of([]) } },
        { provide: UsuarioService, useValue: { listar: () => of([]) } },
        { provide: EquipamentoService, useValue: { listar: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('getEquipamentoExibicao usa mapa de equipamentos', () => {
    component.equipamentoNomeMap.set('eq1', 'Bomba X');
    expect(
      component.getEquipamentoExibicao({
        idOrdemServico: '1',
        numeroOrdemServico: '1',
        idEquipamento: 'eq1',
        tipoManutencao: 'CORRETIVA',
        prioridadeOrdemServico: 'MEDIA',
        statusOrdemServico: OrdemStatus.ABERTO,
        descricaoFalha: 'x',
        dataCriacao: '',
        dataAtualizacao: '',
      })
    ).toBe('Bomba X');
  });

  it('getDescricaoOrdemExibicao faz fallback descricaoOrdemServico → descricaoServico → descricaoFalha', () => {
    expect(
      component.getDescricaoOrdemExibicao({
        idOrdemServico: '1',
        numeroOrdemServico: '1',
        idEquipamento: 'eq1',
        tipoManutencao: 'CORRETIVA',
        prioridadeOrdemServico: 'MEDIA',
        statusOrdemServico: OrdemStatus.ABERTO,
        descricaoFalha: 'Falha na bomba',
        dataCriacao: '',
        dataAtualizacao: '',
      })
    ).toBe('Falha na bomba');
  });
});
