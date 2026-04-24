import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatoriosOs } from './relatorios-os';

describe('RelatoriosOs', () => {
  let component: RelatoriosOs;
  let fixture: ComponentFixture<RelatoriosOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatoriosOs],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosOs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
