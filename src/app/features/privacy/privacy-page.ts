import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { Icon } from '../../shared/ui/icon/icon';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, Icon],
  templateUrl: './privacy-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  private readonly seo = inject(SeoService);
  protected readonly lastUpdated = '8 de agosto de 2026';

  constructor() {
    this.seo.apply({
      title: 'Política de privacidad | Hacé Números',
      description:
        'Información sobre el tratamiento de datos, cookies y publicidad en Hacé Números.',
      canonicalPath: '/privacidad',
      robots: 'noindex,follow',
    });
  }
}
