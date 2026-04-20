import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OsDetail } from './os-detail';

describe('OsDetail', () => {
  let component: OsDetail;
  let fixture: ComponentFixture<OsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsDetail]
    }).compileComponents();

    fixture = TestBed.createComponent(OsDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir número da OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2024-0881');
  });

  it('deve exibir tipo e prioridade', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Manutenção Corretiva');
    expect(compiled.textContent).toContain('Prioridade Crítica');
  });

  it('deve exibir equipamento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Prensa Hidráulica 400T');
    expect(compiled.textContent).toContain('EQ-PH-088');
  });

  it('deve exibir solicitante', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pedro Oliveira');
    expect(compiled.textContent).toContain('Operador de Produção III');
  });

  it('deve exibir descrição da falha', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vazamento intermitente');
  });

  it('deve renderizar timeline com 3 eventos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const events = compiled.querySelectorAll('.space-y-8 > div.relative');
    expect(events.length).toBe(3);
  });

  it('deve exibir evento de início da manutenção', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Início da Manutenção');
    expect(compiled.textContent).toContain('Iniciando desmontagem');
  });

  it('deve ter select de técnicos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select');
    expect(select).toBeTruthy();
    expect(select?.options.length).toBe(3);
  });

  it('deve ter botão de reatribuir', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button:has(.material-symbols-outlined:contains("sync"))');
    expect(compiled.textContent).toContain('Reatribuir Equipe');
  });

  it('deve ter seção de fechamento desabilitada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const closeSection = compiled.querySelector('.opacity-60.grayscale');
    expect(closeSection).toBeTruthy();
    expect(closeSection?.textContent).toContain('Fechamento de OS');
  });

  it('deve ter botão de encerrar desabilitado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const closeButton = compiled.querySelector('button[disabled]');
    expect(closeButton).toBeTruthy();
    expect(closeButton?.textContent).toContain('Encerrar Ordem de Serviço');
  });

  it('deve exibir manual do equipamento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Manual_PH400T_v2.pdf');
    expect(compiled.textContent).toContain('8.4 MB');
  });

  it('deve ter FAB de novo comentário', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector('.fixed.bottom-8');
    expect(fab).toBeTruthy();
    expect(compiled.textContent).toContain('Novo Comentário');
  });
});