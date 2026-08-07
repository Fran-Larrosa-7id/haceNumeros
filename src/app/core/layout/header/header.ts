import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon/icon';

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
}
