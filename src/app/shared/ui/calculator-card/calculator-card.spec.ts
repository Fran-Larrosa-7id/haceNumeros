import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CalculatorCard, CalculatorSummary } from './calculator-card';

describe('CalculatorCard', () => {
  let fixture: ComponentFixture<CalculatorCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculatorCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(CalculatorCard);
  });

  it('turns the complete available card into one descriptive link', () => {
    render({
      title: 'Calculadora de prueba',
      description: 'Descripción',
      category: 'Categoría',
      icon: 'calculator',
      route: '/calculadora-prueba',
    });
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('article > a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/calculadora-prueba');
    expect(links[0].textContent).toContain('Abrir Calculadora de prueba');
    expect(links[0].classList).toContain('inset-0');
  });

  it('does not create a fake link for a future calculator', () => {
    render({
      title: 'Próxima herramienta',
      description: 'Descripción',
      category: 'Categoría',
      icon: 'calculator',
    });
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a')).toBeNull();
    expect(element.textContent).toContain('Próximamente');
  });

  function render(calculator: CalculatorSummary): void {
    fixture.componentRef.setInput('calculator', calculator);
    fixture.detectChanges();
  }
});
