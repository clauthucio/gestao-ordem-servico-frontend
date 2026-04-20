import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar 4 cards de métricas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.grid-cols-1 > div, .md\\:grid-cols-2 > div, .lg\\:grid-cols-4 > div');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('deve exibir valor de OS abertas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('12');
  });

  it('deve exibir alerta crítico', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ação imediata necessária');
  });

  it('deve renderizar tabela com 5 ordens', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('deve exibir status "Prioridade Crítica"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Prioridade Crítica');
  });

  it('deve renderizar gráfico de atividade com 7 barras', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const bars = compiled.querySelectorAll('.h-32 > div');
    expect(bars.length).toBe(7);
  });

  it('deve exibir resumo de eficiência', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('94%');
  });

  it('deve listar 3 técnicos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tecnicos = compiled.querySelectorAll('.space-y-4 > div');
    expect(tecnicos.length).toBe(3);
  });

  it('deve renderizar botão de relatório', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Gerar PDF');
  });

  it('deve ter FAB', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector('.fixed.bottom-8');
    expect(fab).toBeTruthy();
  });
});