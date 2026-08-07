import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Página no encontrada | Hacé Números',
      description: 'La página solicitada no existe o cambió de ubicación.',
      robots: 'noindex,follow',
    });
  }
}
