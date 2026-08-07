import { ViewportScroller } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';

describe('Header navigation', () => {
  let fixture: ComponentFixture<Header>;
  let element: HTMLElement;
  const viewportScroller = {
    scrollToPosition: vi.fn(),
    scrollToAnchor: vi.fn(),
  };

  beforeEach(async () => {
    viewportScroller.scrollToPosition.mockClear();
    viewportScroller.scrollToAnchor.mockClear();
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: ViewportScroller, useValue: viewportScroller }],
    }).compileComponents();
    fixture = TestBed.createComponent(Header);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('uses the brand as a real home link that also returns to the top', () => {
    const brand = element.querySelector<HTMLAnchorElement>('a[href="/"]');
    expect(brand?.textContent).toContain('Hacé Números');
    brand?.click();
    expect(viewportScroller.scrollToPosition).toHaveBeenCalledWith([0, 0]);
  });

  it('links each desktop option to a useful and distinct home section', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('div.lg\\:flex a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/#calculadoras',
      '/#dinero-y-trabajo',
      '/#impuestos-y-emprendimientos',
      '/#hogar-y-movilidad',
      '/#como-funciona',
    ]);
    links[0].click();
    expect(viewportScroller.scrollToAnchor).toHaveBeenCalledWith('calculadoras');
  });
});
