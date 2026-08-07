import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon/icon';
import { ThemeService } from '../../theme/theme.service';

interface NavItem {
  readonly label: string;
  readonly fragment: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, Icon],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);
  protected readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);
  protected readonly navItems: readonly NavItem[] = [
    { label: 'Calculadoras', fragment: 'calculadoras' },
    { label: 'Dinero y trabajo', fragment: 'dinero-y-trabajo' },
    { label: 'Impuestos y emprendimientos', fragment: 'impuestos-y-emprendimientos' },
    { label: 'Hogar y movilidad', fragment: 'hogar-y-movilidad' },
    { label: 'Cómo funciona', fragment: 'como-funciona' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected navigateHome(): void {
    this.closeMenu();
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  protected navigateToSection(fragment: string): void {
    this.closeMenu();
    if (this.router.url.split(/[?#]/, 1)[0] === '/') {
      this.viewportScroller.scrollToAnchor(fragment);
    }
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
