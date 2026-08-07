import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SalaryCalculatorPage } from './salary-calculator-page';

describe('SalaryCalculatorPage', () => {
  let fixture: ComponentFixture<SalaryCalculatorPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalaryCalculatorPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SalaryCalculatorPage);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    http.expectOne('data/salary/parameters.json').flush(parameters());
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders an honest idle state and current source metadata', () => {
    expect(result().textContent).toContain('Ingresá un sueldo');
    expect(result().textContent).not.toContain('1.660.000');
    expect(element.textContent).toContain('agosto de 2026');
    expect(element.textContent).toContain('4.594.798,23');
  });

  it('calculates gross to net with fixed other discounts', () => {
    set('#salary-amount', '2.000.000');
    set('#other-discounts', '100.000');
    click('Calcular sueldo neto');
    expect(result().textContent).toContain('1.560.000');
    expect(result().textContent).toContain('340.000');
  });

  it('calculates net to gross and changes the result heading', () => {
    click('Neto a bruto');
    set('#salary-amount', '1.660.000');
    click('Calcular sueldo bruto');
    expect(result().textContent).toContain('Sueldo bruto mensual estimado necesario');
    expect(result().textContent).toContain('2.000.000');
  });

  it('applies and explains the maximum contribution base', () => {
    set('#salary-amount', '5.000.000');
    click('Calcular sueldo neto');
    expect(result().textContent).toContain('Tope aplicado');
    expect(result().textContent).toContain('4.594.798,23');
  });

  it('publishes canonical metadata and only BreadcrumbList JSON-LD', () => {
    expect(document.title).toBe('Calculadora de sueldo bruto a neto en Argentina | Hacé Números');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hacenumeros.com/calculadora-sueldo-bruto-neto',
    );
    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[data-seo-structured-data]',
    );
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '')['@type']).toBe('BreadcrumbList');
  });

  function result(): HTMLElement {
    return element.querySelector('aside[aria-labelledby="salary-result-title"]') as HTMLElement;
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
  function parameters(): object {
    return {
      schemaVersion: 1,
      type: 'salary-general-regime',
      country: 'AR',
      effectiveFrom: '2026-08-01',
      rates: { retirement: 0.11, healthInsurance: 0.03, inssjp: 0.03 },
      contributionBase: {
        minimum: 141380.42,
        maximum: 4594798.23,
        minimumAppliedByCalculator: false,
      },
      sources: Array.from({ length: 5 }, (_, index) => ({
        name: `Fuente ${index}`,
        url: `https://example.com/${index}`,
      })),
    };
  }
});
