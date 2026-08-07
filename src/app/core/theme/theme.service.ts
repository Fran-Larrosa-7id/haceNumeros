import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

const STORAGE_KEY = 'hace-numeros-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly selectedTheme = signal<ColorTheme>('light');

  readonly theme = this.selectedTheme.asReadonly();
  readonly isDark = computed(() => this.selectedTheme() === 'dark');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const appliedTheme = this.document.documentElement.dataset['theme'];
    this.apply(appliedTheme === 'dark' ? 'dark' : this.resolveInitialTheme(), false);
  }

  toggle(): void {
    this.apply(this.isDark() ? 'light' : 'dark', true);
  }

  private resolveInitialTheme(): ColorTheme {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
    } catch {
      // El tema sigue funcionando aunque el navegador bloquee el almacenamiento.
    }

    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(theme: ColorTheme, persist: boolean): void {
    this.selectedTheme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document.documentElement.style.colorScheme = theme;

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // No impedimos cambiar el tema cuando localStorage no está disponible.
      }
    }
  }
}
