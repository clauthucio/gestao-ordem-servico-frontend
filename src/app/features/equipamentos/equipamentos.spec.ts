import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Equipamentos } from './equipamentos';
import { EquipamentoService } from '../../core/http/equipamento.service';
import type { EquipamentoListItem } from '../../core/models/equipamento.model';

describe('Equipamentos', () => {
  let component: Equipamentos;
  let fixture: ComponentFixture<Equipamentos>;

  const deletarSpy = vi.fn(() => of(void 0));

  const equipamentoServiceStub = {
    listar: () => of([]),
    criar: () => of({ nome: 'Teste' }),
    buscarPorId: () => of({}),
    atualizar: () => of({}),
    deletar: deletarSpy,
  };

  const equipamentoMock: EquipamentoListItem = {
    id: 'eq-1',
    codigo: 'EQ-001',
    nome: 'Bomba teste',
    tipo: 'HIDRAULICO',
    localizacao: 'Galpão 1',
    fabricante: null,
    modelo: null,
    ativo: true,
    dataCriacao: '2024-01-01',
    dataAtualizacao: '2024-01-01',
    ordensAbertasCount: 0,
    nomeUsuarioCriacao: null,
    nomeUsuarioUltimaModificacao: null,
  };

  const mouseEventStub = { stopPropagation: vi.fn() } as unknown as MouseEvent;

  beforeEach(async () => {
    deletarSpy.mockClear();
    deletarSpy.mockImplementation(() => of(void 0));

    await TestBed.configureTestingModule({
      imports: [Equipamentos],
      providers: [
        provideRouter([]),
        { provide: EquipamentoService, useValue: equipamentoServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Equipamentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('canDeactivate retorna true quando não há formulário de modal alterado', () => {
    expect(component.canDeactivate()).toBe(true);
  });

  it('canDeactivate retorna false quando o usuário cancela a saída com modal novo sujo', () => {
    component.showModalNovo = true;
    component.formNovo.markAsDirty();
    const originalConfirm = window.confirm;
    window.confirm = (): boolean => false;
    expect(component.canDeactivate()).toBe(false);
    window.confirm = originalConfirm;
  });

  it('onExcluir exibe diálogo de confirmação sem chamar deletar ainda', () => {
    component.onExcluir(equipamentoMock, mouseEventStub);
    expect(component.dialogVisivel).toBe(true);
    expect(component.dialogTipo).toBe('confirmacao');
    expect(component.dialogTitulo).toBe('Confirmar exclusão');
    expect(component.dialogMensagem).toContain(equipamentoMock.nome);
    expect(component.dialogMensagem).toContain(equipamentoMock.codigo);
    expect(component.dialogMensagem).toContain('O histórico do equipamento será perdido');
    expect(deletarSpy).not.toHaveBeenCalled();
  });

  it('onExcluir com status Em manutenção exibe erro e não chama deletar', () => {
    const emManutencao: EquipamentoListItem = {
      ...equipamentoMock,
      ordensAbertasCount: 1,
    };
    component.onExcluir(emManutencao, mouseEventStub);
    expect(component.dialogVisivel).toBe(true);
    expect(component.dialogTipo).toBe('erro');
    expect(component.dialogTitulo).toBe('Não é possível excluir');
    expect(component.dialogMensagem).toBe(
      'Equipamento vinculado a uma Ordem de Serviço em aberto. Finalize a Ordem de Serviço para prosseguir',
    );
    expect(deletarSpy).not.toHaveBeenCalled();
  });

  it('onDialogAcao com cancelar fecha o diálogo sem excluir', () => {
    component.onExcluir(equipamentoMock, mouseEventStub);
    component.onDialogAcao('cancelar');
    expect(component.dialogVisivel).toBe(false);
    expect(deletarSpy).not.toHaveBeenCalled();
  });

  it('onDialogAcao com confirmar chama equipamentoService.deletar e exibe sucesso após recarregar', () => {
    component.onExcluir(equipamentoMock, mouseEventStub);
    component.onDialogAcao('confirmar');
    expect(deletarSpy).toHaveBeenCalledTimes(1);
    expect(deletarSpy).toHaveBeenCalledWith(equipamentoMock.id);
    expect(component.dialogVisivel).toBe(true);
    expect(component.dialogTipo).toBe('info');
    expect(component.dialogTitulo).toBe('Sucesso');
    expect(component.dialogMensagem).toBe('Equipamento foi excluído com sucesso.');
  });
});
