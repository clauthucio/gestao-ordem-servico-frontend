import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastroEquipamento } from './cadastro-equipamentos';

describe('CadastroEquipamento', () => {
  let component: CadastroEquipamento;
  let fixture: ComponentFixture<CadastroEquipamento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroEquipamento]
    }).compileComponents();

    fixture = TestBed.createComponent(CadastroEquipamento);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cadastro de Equipamento');
  });

  it('deve ter campo código/tag', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="codigo"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('placeholder')).toContain('EQ-2024-001');
  });

  it('deve ter campo nome', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="nome"]');
    expect(input).toBeTruthy();
  });

  it('deve ter select de categoria', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select[name="categoria"]');
    expect(select).toBeTruthy();
    expect(compiled.textContent).toContain('Elétrico');
    expect(compiled.textContent).toContain('Hidráulico');
    expect(compiled.textContent).toContain('Mecânico');
  });

  it('deve ter campos marca e modelo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Marca');
    expect(compiled.textContent).toContain('Modelo');
  });

  it('deve ter campo número de série', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Número de Série');
  });

  it('deve ter campo data de aquisição', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Data de Aquisição');
  });

  it('deve ter campos de localização', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Setor');
    expect(compiled.textContent).toContain('Localização Física');
  });

  it('deve ter 4 opções de status', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const radios = compiled.querySelectorAll('input[type="radio"][name="status"]');
    expect(radios.length).toBe(4);
    expect(compiled.textContent).toContain('Operacional');
    expect(compiled.textContent).toContain('Em Manutenção');
    expect(compiled.textContent).toContain('Parado');
    expect(compiled.textContent).toContain('Crítico');
  });

  it('deve ter 3 opções de criticidade ABC', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const radios = compiled.querySelectorAll('input[type="radio"][name="criticidade"]');
    expect(radios.length).toBe(3);
    expect(compiled.textContent).toContain('A - Alta Prioridade');
    expect(compiled.textContent).toContain('B - Média Prioridade');
    expect(compiled.textContent).toContain('C - Baixa Prioridade');
  });

  it('deve ter select de periodicidade preventiva', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select[name="periodicidade"]');
    expect(select).toBeTruthy();
    expect(compiled.textContent).toContain('6 meses');
  });

  it('deve ter gerador de QR Code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('QR Code');
    expect(compiled.textContent).toContain('Gerar QR Code');
  });

  it('deve gerar QR Code ao clicar', () => {
    component.codigo = 'EQ-001';
    component.onGerarQRCode();
    expect(component.qrCodeGerado).toBe(true);
  });

  it('deve ter área de anexar arquivo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Anexar Manual/Foto');
  });

  it('deve ter textarea de observações', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[name="observacoes"]');
    expect(textarea).toBeTruthy();
  });

  it('deve ter botões de ação no header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cancelar');
    expect(compiled.textContent).toContain('Limpar');
    expect(compiled.textContent).toContain('Salvar Equipamento');
  });

  it('deve ter botões de ação no footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const footers = compiled.querySelectorAll('.border-t button');
    expect(footers.length).toBeGreaterThanOrEqual(3);
  });

  it('deve limpar formulário', () => {
    component.codigo = 'TESTE';
    component.nome = 'TESTE';
    component.onLimpar();
    expect(component.codigo).toBe('');
    expect(component.nome).toBe('');
    expect(component.qrCodeGerado).toBe(false);
  });
});