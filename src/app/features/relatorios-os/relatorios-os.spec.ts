import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrdemStatus } from '../../core/enums/status.enum';
import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { UsuarioService } from '../../core/http/usuario.service';
import type { OrdemServico } from '../../core/models/ordem-servico.model';
import { RelatoriosOs } from './relatorios-os';

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
    expect(el.textContent).toContain('Relatório de Produtividade por Técnico');
  });

  it('filtro de status padrão é apenas Concluído', () => {
    expect(component.statusSelecionados).toEqual([OrdemStatus.CONCLUIDO]);
  });

  it('resumosPorStatus tem um bloco de cartões por cada status selecionado (ordem fixa)', () => {
    expect(component.resumosPorStatus.length).toBe(1);
    expect(component.resumosPorStatus.map((r) => r.status)).toEqual([OrdemStatus.CONCLUIDO]);
  });

  it('limparFiltros repõe status ao padrão', () => {
    component.statusSelecionados = [OrdemStatus.ABERTO];
    component.limparFiltros();
    expect(component.statusSelecionados).toEqual([OrdemStatus.CONCLUIDO]);
  });

  it('não permite desmarcar o último status no pendente e mantém seleção', () => {
    component.statusSelecionadosPendente = [OrdemStatus.ABERTO];
    component.alternarStatusPendente(OrdemStatus.ABERTO, false);
    expect(component.erro).toContain('pelo menos');
    expect(component.statusMarcadoPendente(OrdemStatus.ABERTO)).toBe(true);
  });

  it('tituloPrincipalExportacao e textoFiltroStatusExportacao refletem o filtro', () => {
    expect(component.tituloPrincipalExportacao()).toContain('ordens de serviço');
    expect(component.textoFiltroStatusExportacao()).toContain('Concluído');
  });

  it('confirmarSelecaoStatus aplica pendente e fecha o painel', () => {
    component.painelStatusAberto = true;
    component.statusSelecionadosPendente = [OrdemStatus.CONCLUIDO, OrdemStatus.EM_ANDAMENTO];
    component.confirmarSelecaoStatus();
    expect(component.statusSelecionados).toEqual([OrdemStatus.CONCLUIDO, OrdemStatus.EM_ANDAMENTO]);
    expect(component.painelStatusAberto).toBe(false);
  });

  it('confirmarSelecaoStatus com lista vazia define erro', () => {
    component.statusSelecionadosPendente = [];
    component.confirmarSelecaoStatus();
    expect(component.erro).toContain('pelo menos');
  });

  it('cancelarPainelStatus repõe pendente a partir do aplicado e fecha', () => {
    component.statusSelecionados = [OrdemStatus.CONCLUIDO];
    component.painelStatusAberto = true;
    component.statusSelecionadosPendente = [OrdemStatus.CONCLUIDO, OrdemStatus.ABERTO];
    component.cancelarPainelStatus();
    expect(component.statusSelecionados).toEqual([OrdemStatus.CONCLUIDO]);
    expect(component.statusSelecionadosPendente).toEqual([OrdemStatus.CONCLUIDO]);
    expect(component.painelStatusAberto).toBe(false);
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

  it('deve recalcular resumo ao alterar período (aoAlterarFiltro) sem botão Aplicar', () => {
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

  it('limparFiltros repõe janela de 7 dias e recalcula o relatório', () => {
    component.dataInicio = '2000-01-01';
    component.dataFim = '2000-01-31';
    component.aoAlterarFiltro();
    component.limparFiltros();
    const hoje = new Date();
    const esperadoFim = ymd(hoje);
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    ini.setDate(ini.getDate() - 7);
    expect(component.dataFim).toBe(esperadoFim);
    expect(component.dataInicio).toBe(ymd(ini));
    expect(component.resumo.totalOs).toBe(1);
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
