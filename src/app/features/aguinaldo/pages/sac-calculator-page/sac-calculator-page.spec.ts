import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SacCalculatorPage } from './sac-calculator-page';

describe('SacCalculatorPage', () => {
  let fixture: ComponentFixture<SacCalculatorPage>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SacCalculatorPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(SacCalculatorPage);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders an honest empty result', () => {
    expect(result().textContent).toContain('Completá tus datos');
    expect(result().textContent).not.toContain('$ 1.000.000');
  });

  it('calculates 50 percent of the manual best gross remuneration', () => {
    set('#sac-best-remuneration', '2.000.000');
    click('Calcular aguinaldo');
    expect(result().textContent).toContain('1.000.000');
    expect(result().textContent).toContain('Importe bruto');
  });

  it('finds the greatest of six months and reports its month', () => {
    click('Cargar los 6 meses');
    set('#sac-month-1', '900.000');
    set('#sac-month-4', '1.300.000');
    set('#sac-month-6', '1.100.000');
    click('Calcular aguinaldo');
    expect(result().textContent).toContain('650.000');
    expect(result().textContent).toContain('Abril');
  });

  it('calculates an inclusive one-day proportional period with real semester days', () => {
    click('Julio – Diciembre');
    click('No, calcular proporcional');
    set('#sac-best-remuneration', '1.000.000');
    set('#sac-start-date', '2026-07-01');
    set('#sac-end-date', '2026-07-01');
    click('Calcular aguinaldo');
    expect(result().textContent).toContain('1 de 184');
    expect(result().textContent).toContain('2.717,39');
  });

  it('publishes canonical metadata and BreadcrumbList structured data', () => {
    expect(document.title).toBe('Calculadora de aguinaldo en Argentina | Hacé Números');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hacenumeros.com/calculadora-aguinaldo',
    );
    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[data-seo-structured-data]',
    );
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '')['@type']).toBe('BreadcrumbList');
  });

  function result(): HTMLElement {
    return element.querySelector('aside[aria-labelledby="sac-result-title"]') as HTMLElement;
  }

  function set(selector: string, value: string): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function click(label: string): void {
    const target = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes(label),
    );
    if (!target) throw new Error(`No button ${label}`);
    target.click();
    fixture.detectChanges();
  }
});
