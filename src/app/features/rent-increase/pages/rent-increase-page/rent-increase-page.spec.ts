import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RentIncreasePage } from './rent-increase-page';

describe('RentIncreasePage', () => {
  let fixture: ComponentFixture<RentIncreasePage>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentIncreasePage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RentIncreasePage);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders the idle result without a fictitious amount', () => {
    const result = query<HTMLElement>('aside[aria-labelledby="result-title"]');

    expect(result.textContent).toContain('Completá los datos');
    expect(result.textContent).not.toContain('615.400');
  });

  it('calculates manually and replaces the result with an unavailable index state', () => {
    setControlValue('#index-type', 'manual', 'change');
    fixture.detectChanges();
    setControlValue('#current-rent', '100000');
    setControlValue('#manual-percentage', '10');
    query<HTMLButtonElement>('button[type="submit"]').click();
    fixture.detectChanges();

    const result = query<HTMLElement>('aside[aria-labelledby="result-title"]');
    expect(result.textContent).toContain('110.000');

    setControlValue('#index-type', 'icl', 'change');
    fixture.detectChanges();
    setControlValue('#last-adjustment', '2025-01-01');
    setControlValue('#next-adjustment', '2026-01-01');
    query<HTMLButtonElement>('button[type="submit"]').click();
    fixture.detectChanges();

    expect(result.textContent).toContain('Datos no disponibles');
    expect(result.textContent).not.toContain('110.000');
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
