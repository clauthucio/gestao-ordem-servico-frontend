import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovaOs } from './nova-os';

describe('NovaOs', () => {
  let component: NovaOs;
  let fixture: ComponentFixture<NovaOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaOs]
    }).compileComponents();

    fixture = TestBed.createComponent(NovaOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nova Ordem de Serviço');
  });

  it('deve exibir número da OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS-2026-0482');
  });

  it('deve ter select de ativos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select[name="ativo"]');
    expect(select).toBeTruthy();
    expect(compiled.textContent).toContain('Injetora 04');
    expect(compiled.textContent).toContain('Esteira B2');
  });

  it('deve ter textarea de descrição', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[name="descricao"]');
    expect(textarea).toBeTruthy();
    expect(textarea?.getAttribute('placeholder')).toContain('Descreva o problema');
  });

  it('deve ter radio buttons de tipo de manutenção', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const radios = compiled.querySelectorAll('input[type="radio"][name="maint_type"]');
    expect(radios.length).toBe(3);
    expect(compiled.textContent).toContain('Corretiva');
    expect(compiled.textContent).toContain('Preventiva');
    expect(compiled.textContent).toContain('Preditiva');
  });

  it('deve ter select de prioridade', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select[name="prioridade"]');
    expect(select).toBeTruthy();
    expect(compiled.textContent).toContain('Baixa');
    expect(compiled.textContent).toContain('Crítica');
  });

  it('deve mostrar alerta quando prioridade é crítica', () => {
    component.prioridade = 'critica';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('notificação imediata ao gerente de planta');
  });

  it('deve esconder alerta quando prioridade não é crítica', () => {
    component.prioridade = 'media';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('notificação imediata ao gerente de planta');
  });

  it('deve ter botão cancelar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cancelar');
  });

  it('deve ter botão salvar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Salvar Ordem');
  });

  it('deve ter side panel com resumo do ativo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Resumo do Ativo');
    expect(compiled.textContent).toContain('4.820h');
    expect(compiled.textContent).toContain('Em Operação');
  });

  it('deve chamar onSalvar ao submeter', () => {
    const spy = jest.spyOn(component, 'onSalvar');
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    expect(spy).toHaveBeenCalled();
  });
});