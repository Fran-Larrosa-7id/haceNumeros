import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SacCalculatorForm } from './sac-calculator-form';

describe('SacCalculatorForm', () => {
  let fixture: ComponentFixture<SacCalculatorForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SacCalculatorForm] }).compileComponents();
    fixture = TestBed.createComponent(SacCalculatorForm);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('starts empty and rejects a calculation without remuneration', () => {
    const invalid = vi.fn();
    fixture.componentInstance.invalidSubmitted.subscribe(invalid);
    click('Calcular aguinaldo');
    expect(invalid).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Ingresá una remuneración mayor a cero');
  });

  it('preserves the Argentine-formatted magnitude in manual mode', () => {
    const calculate = vi.fn();
    fixture.componentInstance.calculateRequested.subscribe(calculate);
    set('#sac-best-remuneration', '2.000.000,50');
    click('Calcular aguinaldo');
    expect(calculate.mock.calls[0][0].bestRemuneration).toBe(2_000_000.5);
    expect(calculate.mock.calls[0][0].semester).toBe('first');
  });

  it('loads the six semester months and submits their real values', () => {
    const calculate = vi.fn();
    fixture.componentInstance.calculateRequested.subscribe(calculate);
    click('Cargar los 6 meses');
    set('#sac-month-1', '900.000');
    set('#sac-month-4', '1.300.000');
    click('Calcular aguinaldo');
    expect(calculate.mock.calls[0][0].monthlyValues[3]).toEqual({
      month: 4,
      remuneration: 1_300_000,
    });
  });

  it('requires proportional dates inside the selected semester', () => {
    const invalid = vi.fn();
    fixture.componentInstance.invalidSubmitted.subscribe(invalid);
    set('#sac-best-remuneration', '1.000.000');
    click('No, calcular proporcional');
    set('#sac-start-date', '2026-07-01');
    set('#sac-end-date', '2026-07-31');
    click('Calcular aguinaldo');
    expect(invalid).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('dentro del semestre');
  });

  it('shows the December adjustment notice for the second semester', () => {
    click('Julio – Diciembre');
    expect(element.textContent).toContain('18 de diciembre');
    expect(element.textContent).toContain('ajustar luego la diferencia');
  });

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
