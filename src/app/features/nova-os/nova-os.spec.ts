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
});
