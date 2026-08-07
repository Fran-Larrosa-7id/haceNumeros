import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SITE_URL = 'https://hacenumeros.com';
const SITE_NAME = 'Hacé Números';

export interface SeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath?: string;
  readonly ogType?: string;
  readonly robots?: 'index,follow' | 'noindex,follow';
  readonly structuredData?: readonly Readonly<Record<string, unknown>>[];
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply(metadata: SeoMetadata): void {
    const canonicalUrl = metadata.canonicalPath ? `${SITE_URL}${metadata.canonicalPath}` : null;

    this.title.setTitle(metadata.title);
    this.meta.updateTag({ name: 'description', content: metadata.description });
    this.meta.updateTag({ name: 'robots', content: metadata.robots ?? 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: metadata.title });
    this.meta.updateTag({ property: 'og:description', content: metadata.description });
    this.meta.updateTag({ property: 'og:type', content: metadata.ogType ?? 'website' });
    if (canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    } else {
      this.meta.removeTag('property="og:url"');
    }
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: metadata.title });
    this.meta.updateTag({ name: 'twitter:description', content: metadata.description });

    this.updateCanonical(canonicalUrl);
    this.updateStructuredData(metadata.structuredData ?? []);
  }

  private updateCanonical(url: string | null): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      canonical?.remove();
      return;
    }
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
  }

  private updateStructuredData(entries: readonly Readonly<Record<string, unknown>>[]): void {
    this.document.head
      .querySelectorAll('script[data-seo-structured-data]')
      .forEach((element) => element.remove());

    for (const entry of entries) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-structured-data', '');
      script.textContent = JSON.stringify(entry);
      this.document.head.appendChild(script);
    }
  }
}
