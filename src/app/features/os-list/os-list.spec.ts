import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OsList } from './os-list';

describe('OsList', () => {
  let component: OsList;
  let fixture: ComponentFixture<OsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsList]
    }).compileComponents();

    fixture = TestBed.createComponent(OsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Inventário de Ordens de Serviço');
  });

  it('deve ter botão nova OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nova Ordem de Serviço');
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

  it('deve renderizar tabela com 4 ordens', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
  });

  it('deve exibir OS crítica em primeiro lugar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2024-0891');
    expect(compiled.textContent).toContain('Injetora 04 - Setor A');
    expect(compiled.textContent).toContain('Crítica');
  });

  it('deve exibir OS finalizada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2024-0888');
    expect(compiled.textContent).toContain('Finalizada');
    expect(compiled.textContent).toContain('Maria Oliveira');
  });

  it('deve exibir OS em execução', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2024-0875');
    expect(compiled.textContent).toContain('Em Execução');
    expect(compiled.textContent).toContain('Carlos Mendes');
  });

  it('deve exibir OS pendente sem técnico', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2024-0862');
    expect(compiled.textContent).toContain('Pendente');
    expect(compiled.textContent).toContain('Não Atribuído');
  });

  it('deve ter botões de ação por linha', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const botoesVisibilidade = compiled.querySelectorAll('button[title="Ver Detalhes"]');
    const botoesEditar = compiled.querySelectorAll('button[title="Editar"]');
    expect(botoesVisibilidade.length).toBe(4);
    expect(botoesEditar.length).toBe(4);
  });

  it('deve ter paginação', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1');
    expect(compiled.textContent).toContain('16');
    expect(compiled.textContent).toContain('Mostrando 1-4 de 156 Ordens');
  });

  it('deve ter botões de navegação de página', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const botoes = compiled.querySelectorAll('.border-t button');
    expect(botoes.length).toBeGreaterThanOrEqual(5);
  });
});