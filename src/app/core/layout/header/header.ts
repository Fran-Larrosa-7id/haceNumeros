import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  protected readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);
  protected readonly navItems: readonly NavItem[] = [
    { label: 'Calculadoras', fragment: 'calculadoras' },
    { label: 'Dinero y trabajo', fragment: 'categorias' },
    { label: 'Impuestos y emprendimientos', fragment: 'categorias' },
    { label: 'Hogar y movilidad', fragment: 'categorias' },
    { label: 'Cómo funciona', fragment: 'como-funciona' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
