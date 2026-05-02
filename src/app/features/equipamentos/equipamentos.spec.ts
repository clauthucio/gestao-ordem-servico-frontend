import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Equipamentos } from './equipamentos';
import { EquipamentoService } from '../../core/http/equipamento.service';

describe('Equipamentos', () => {
  let component: Equipamentos;
  let fixture: ComponentFixture<Equipamentos>;

  const equipamentoServiceStub = {
    listar: () => of([]),
    criar: () => of({ nome: 'Teste' }),
    buscarPorId: () => of({}),
    atualizar: () => of({}),
    deletar: () => of(void 0),
  };

  beforeEach(async () => {
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
});
