import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopNav } from './top-bar';

describe('TopNav', () => {
  let component: TopNav;
  let fixture: ComponentFixture<TopNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopNav]
    }).compileComponents();

    fixture = TestBed.createComponent(TopNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pageTitle', 'Painel Operacional');
    fixture.componentRef.setInput('user', {
      name: 'Carlos Silva',
      role: 'Supervisor',
      avatarUrl: 'https://example.com/avatar.jpg'
    });
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o título da página', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toBe('Painel Operacional');
  });

  it('deve exibir o nome do usuário', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Carlos Silva');
  });
});