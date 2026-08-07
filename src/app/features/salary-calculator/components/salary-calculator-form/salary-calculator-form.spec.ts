import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalaryCalculatorForm } from './salary-calculator-form';

describe('SalaryCalculatorForm', () => {
  let fixture: ComponentFixture<SalaryCalculatorForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SalaryCalculatorForm] }).compileComponents();
    fixture = TestBed.createComponent(SalaryCalculatorForm);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('starts in gross-to-net mode and rejects an empty submit', () => {
    const invalid = vi.fn();
    fixture.componentInstance.invalidSubmitted.subscribe(invalid);
    button('Calcular sueldo neto').click();
    fixture.detectChanges();
    expect(invalid).toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresá un sueldo mayor a cero');
  });

  it('preserves Argentine-formatted salary magnitude in the submission', () => {
    const calculate = vi.fn();
    fixture.componentInstance.calculateRequested.subscribe(calculate);
    input('#salary-amount', '2.000.000');
    input('#other-discounts', '100.000');
    button('Calcular sueldo neto').click();
    expect(calculate).toHaveBeenCalledWith({
      mode: 'gross-to-net',
      amount: 2_000_000,
      otherDiscounts: 100_000,
    });
  });

  it('switches to the real inverse mode and clears the previous values', () => {
    const cleared = vi.fn();
    fixture.componentInstance.cleared.subscribe(cleared);
    input('#salary-amount', '2.000.000');
    button('Neto a bruto').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Sueldo neto deseado');
    expect((element.querySelector('#salary-amount') as HTMLInputElement).value).toBe('');
    expect(cleared).toHaveBeenCalled();
  });

  function input(selector: string, value: string): void {
    const control = element.querySelector(selector) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
  function button(label: string): HTMLButtonElement {
    const match = [...element.querySelectorAll('button')].find((item) =>
      item.textContent?.includes(label),
    );
    if (!match) throw new Error(`No button ${label}`);
    return match;
  }
});
