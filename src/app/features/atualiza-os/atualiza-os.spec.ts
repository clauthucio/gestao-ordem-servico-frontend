import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AtualizaOs } from './atualiza-os';

describe('AtualizaOs', () => {
  let component: AtualizaOs;
  let fixture: ComponentFixture<AtualizaOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtualizaOs]
    }).compileComponents();

    fixture = TestBed.createComponent(AtualizaOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir número da OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OS #8842-EX');
  });

  it('deve exibir título da OS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reparo Motor EX-22');
  });

  it('deve exibir localização e solicitante', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ala Sul - Setor de Compressão');
    expect(compiled.textContent).toContain('Engenharia de Processos');
  });

  it('deve exibir prioridade', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Prioridade: Alta');
  });

  it('deve ter botão voltar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Voltar');
  });

  it('deve ter 3 opções de status', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const radios = compiled.querySelectorAll('input[type="radio"][name="status"]');
    expect(radios.length).toBe(3);
    expect(compiled.textContent).toContain('Em andamento');
    expect(compiled.textContent).toContain('Aguardando Peça');
    expect(compiled.textContent).toContain('Concluída');
  });

  it('deve ter status "Em andamento" selecionado por padrão', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const radioEmAndamento = compiled.querySelector('input[value="em_andamento"]') as HTMLInputElement;
    expect(radioEmAndamento.checked).toBe(true);
  });

  it('deve ter textarea de relato técnico', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[name="relato"]');
    expect(textarea).toBeTruthy();
    expect(textarea?.getAttribute('placeholder')).toContain('Descreva as ações realizadas');
  });

  it('deve ter área de anexar foto', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Anexar foto do reparo');
  });

  it('deve ter botão salvar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Salvar Atualização');
  });

  it('deve exibir última atualização', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2h atrás por J. Silva');
  });

  it('deve ter botão reportar incidente', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reportar Incidente');
  });

  it('deve atualizar status ao clicar em radio', () => {
    component.onStatusChange('concluida');
    expect(component.statusSelecionado).toBe('concluida');
  });
});