import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { HomePage } from './features/home/home-page';

describe('App', () => {
  beforeEach(async () => {
    document.documentElement.dataset['theme'] = 'light';
    localStorage.removeItem('hace-numeros-theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.dataset['theme'] = 'light';
    localStorage.removeItem('hace-numeros-theme');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the home heading', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hacé números');
  });

  it('toggles and persists the color theme from the header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('[data-theme-toggle]');

    expect(button?.getAttribute('aria-label')).toBe('Activar modo oscuro');
    button?.click();
    fixture.detectChanges();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('hace-numeros-theme')).toBe('dark');
    expect(button?.getAttribute('aria-label')).toBe('Activar modo claro');
  });
});
