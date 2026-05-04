import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovaOs } from './nova-os';

describe('NovaOs', () => {
  let component: NovaOs;
  let fixture: ComponentFixture<NovaOs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaOs],
    }).compileComponents();

    fixture = TestBed.createComponent(NovaOs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('osNumber segue formato OSyymmdd-nn', () => {
    expect(component.osNumber).toMatch(/^OS\d{6}-\d{2}$/);
  });
});
