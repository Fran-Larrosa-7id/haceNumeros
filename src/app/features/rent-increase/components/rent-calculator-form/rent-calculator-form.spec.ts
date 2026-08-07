import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RentFormValue } from '../../domain/rent-calculation.models';
import { RentCalculatorForm } from './rent-calculator-form';

describe('RentCalculatorForm', () => {
  let fixture: ComponentFixture<RentCalculatorForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RentCalculatorForm] }).compileComponents();
    fixture = TestBed.createComponent(RentCalculatorForm);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('starts empty and exposes accessible validation messages', () => {
    query<HTMLButtonElement>('button[type="submit"]').click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Ingresá el alquiler actual.');
    expect(element.textContent).toContain('Elegí la fecha del último ajuste.');
    expect(query<HTMLInputElement>('#current-rent').getAttribute('aria-invalid')).toBe('true');
  });

  it('emits a typed manual calculation request', () => {
    let emitted: RentFormValue | undefined;
    fixture.componentInstance.calculateRequested.subscribe((value) => (emitted = value));

    setControlValue('#index-type', 'manual', 'change');
    fixture.detectChanges();
    setControlValue('#current-rent', '100000');
    setControlValue('#manual-percentage', '10');
    query<HTMLButtonElement>('button[type="submit"]').click();

    expect(emitted).toEqual({
      currentRent: 100_000,
      indexType: 'manual',
      lastAdjustmentDate: '',
      nextAdjustmentDate: '',
      frequency: 'annual',
      manualPercentage: 10,
    });
  });

  it('uses monthly controls and labels for IPC', () => {
    setControlValue('#index-type', 'ipc', 'change');
    fixture.detectChanges();

    expect(query<HTMLInputElement>('#last-adjustment').dataset['pickerMode']).toBe('month');
    expect(query<HTMLInputElement>('#next-adjustment').dataset['pickerMode']).toBe('month');
    expect(element.textContent).toContain('Mes inicial');
    expect(element.textContent).toContain('Mes final');
  });

  it('clears entered values and emits the reset event', () => {
    let cleared = false;
    fixture.componentInstance.cleared.subscribe(() => (cleared = true));
    setControlValue('#current-rent', '100000');

    query<HTMLButtonElement>('button[type="button"]').click();
    fixture.detectChanges();

    expect(query<HTMLInputElement>('#current-rent').value).toBe('');
    expect(cleared).toBe(true);
  });

  function query<T extends Element>(selector: string): T {
    const match = element.querySelector<T>(selector);
    if (!match) {
      throw new Error(`No se encontró el elemento ${selector}`);
    }
    return match;
  }

  function setControlValue(selector: string, value: string, eventName = 'input'): void {
    const control = query<HTMLInputElement | HTMLSelectElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event(eventName));
  }
});
