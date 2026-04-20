import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SideNav } from './side-nav';

describe('SideNav', () => {
  let component: SideNav;
  let fixture: ComponentFixture<SideNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideNav],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SideNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [
      { label: 'Dashboard', icon: 'dashboard', route: '/' },
      { label: 'Lista de OS', icon: 'assignment', route: '/os' }
    ]);
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o título', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('ServiçoPIM');
  });

  it('deve renderizar os itens de navegação', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('nav a');
    expect(links.length).toBe(2);
  });
});