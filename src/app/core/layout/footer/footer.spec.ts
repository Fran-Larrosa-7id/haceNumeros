import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';

describe('Footer', () => {
  it('links to the published privacy policy', async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/privacidad"]')?.textContent).toContain(
      'Privacidad',
    );
  });
});
