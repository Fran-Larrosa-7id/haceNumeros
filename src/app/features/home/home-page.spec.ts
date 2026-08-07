import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage SEO', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
  });

  it('publishes self-referential production metadata', () => {
    expect(document.title).toBe('Hacé Números | Calculadoras para Argentina');
    expect(metaContent('description')).toContain('fuentes verificables');
    expect(metaContent('robots')).toBe('index,follow');
    expect(propertyContent('og:url')).toBe('https://hacenumeros.com/');
    expect(propertyContent('og:site_name')).toBe('Hacé Números');
    expect(metaContent('twitter:card')).toBe('summary');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hacenumeros.com/',
    );
  });

  it('publishes one valid WebSite structured-data block', () => {
    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[data-seo-structured-data]',
    );
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Hacé Números',
      url: 'https://hacenumeros.com/',
    });
  });

  it('has one heading and real links to both published calculators', () => {
    const body = document.body;
    expect(body.querySelectorAll('h1').length).toBe(1);
    expect(body.querySelector('h1')?.textContent).toContain('calculadoras claras');
    expect(body.textContent).toContain('alquileres, sueldos, impuestos y finanzas personales');
    expect(
      body.querySelector<HTMLImageElement>('img[src="assets/Sol_de_Mayo_Bandera_Argentina.png"]'),
    ).not.toBeNull();
    for (const categoryId of [
      'dinero-y-trabajo',
      'impuestos-y-emprendimientos',
      'hogar-y-movilidad',
    ]) {
      expect(body.querySelector(`#${categoryId}`)).not.toBeNull();
    }
    expect(
      Array.from(body.querySelectorAll<HTMLAnchorElement>('a')).some(
        (link) => link.getAttribute('href') === '/calculadora-aumento-alquiler',
      ),
    ).toBe(true);
    expect(
      Array.from(body.querySelectorAll<HTMLAnchorElement>('a')).some(
        (link) => link.getAttribute('href') === '/calculadora-sueldo-bruto-neto',
      ),
    ).toBe(true);
  });

  function metaContent(name: string): string | null {
    return document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
  }

  function propertyContent(property: string): string | null {
    return (
      document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content ?? null
    );
  }
});
