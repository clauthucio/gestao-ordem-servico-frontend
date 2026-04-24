import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RelatoriosOs } from './relatorios-os';

describe('RelatoriosOs', () => {
  let component: RelatoriosOs;
  let fixture: ComponentFixture<RelatoriosOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatoriosOs]
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Relatório de Produtividade');
  });

  it('deve exibir período', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('01 Out, 2023 - 31 Out, 2023');
  });

  it('deve ter botão exportar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('EXPORTAR');
  });

  it('deve exibir 3 KPIs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total OS Concluídas');
    expect(compiled.textContent).toContain('Total Horas Técnicas');
    expect(compiled.textContent).toContain('Eficiência Média');
  });

  it('deve exibir valores dos KPIs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('342');
    expect(compiled.textContent).toContain('1.840h');
    expect(compiled.textContent).toContain('94.2%');
  });

  it('deve renderizar tabela com 5 técnicos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('deve exibir Anderson Melo em primeiro lugar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Anderson Melo');
    expect(compiled.textContent).toContain('48');
  });

  it('deve exibir Felipe Gomes com média mais alta', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Felipe Gomes');
    expect(compiled.textContent).toContain('4.6h');
  });

  it('deve renderizar gráfico de barras com 5 itens', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const bars = compiled.querySelectorAll('.h-3.w-full > div');
    expect(bars.length).toBe(5);
  });

  it('deve exibir insight do mês', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Insight do Mês');
    expect(compiled.textContent).toContain('Anderson Melo atingiu o menor tempo médio');
  });

  it('deve exibir cards inferiores', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Técnicos Ativos');
    expect(compiled.textContent).toContain('24');
    expect(compiled.textContent).toContain('SLA de Segurança');
    expect(compiled.textContent).toContain('100%');
  });

  it('deve exibir próxima revisão de metas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('15 de Novembro, 2023');
    expect(compiled.textContent).toContain('AGENDAR REUNIÃO');
  });

  it('deve ter botão ver lista completa', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ver Lista Completa');
  });
});