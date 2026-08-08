import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPage } from './privacy-page';

describe('PrivacyPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('publishes noindex privacy metadata and essential disclosures', () => {
    const fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
    expect(document.title).toBe('Política de privacidad | Hacé Números');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,follow',
    );
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hacenumeros.com/privacidad',
    );
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Google AdSense y publicidad futura');
    expect(fixture.nativeElement.textContent).toContain('Cookies y tecnologías similares');
    expect(
      fixture.nativeElement.querySelector('a[href="https://adssettings.google.com/"]'),
    ).not.toBeNull();
  });
});
