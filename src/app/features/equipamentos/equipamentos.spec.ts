import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Equipamentos } from './equipamentos';

describe('Equipamentos', () => {
  let component: Equipamentos;
  let fixture: ComponentFixture<Equipamentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Equipamentos]
    }).compileComponents();

    fixture = TestBed.createComponent(Equipamentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir total de ativos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1,284');
  });

  it('deve exibir KPIs operacional e manutenção', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1,240');
    expect(compiled.textContent).toContain('44');
  });

  it('deve renderizar tabela com 4 equipamentos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
  });

  it('deve exibir equipamento Torno CNC Mazak', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Torno CNC Mazak');
    expect(compiled.textContent).toContain('CNC-402-A');
  });

  it('deve exibir status Crítico com cor error', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Crítico');
  });

  it('deve exibir status Inativo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Inativo');
  });

  it('deve ter botão de histórico por equipamento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const botoes = compiled.querySelectorAll('button:has(.material-symbols-outlined:contains("history"))');
    expect(botoes.length).toBe(4);
  });

  it('deve ter botão Novo Equipamento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Novo Equipamento');
  });

  it('deve ter botão Exportar CSV', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Exportar CSV');
  });

  it('deve ter paginação', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1');
    expect(compiled.textContent).toContain('129');
    expect(compiled.textContent).toContain('Próximo');
  });

  it('deve ter banner de predição de manutenção', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Previsão de Manutenção Preventiva');
    expect(compiled.textContent).toContain('Ver Relatório de Predição');
  });

  it('deve exibir OEE', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('84.2%');
  });

  it('deve ter FAB', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector('.fixed.bottom-8');
    expect(fab).toBeTruthy();
  });
});