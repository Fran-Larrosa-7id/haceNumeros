import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'arrow'
  | 'briefcase'
  | 'calculator'
  | 'calendar'
  | 'car'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'document'
  | 'home'
  | 'info'
  | 'menu'
  | 'money'
  | 'receipt'
  | 'shield'
  | 'shop'
  | 'spark'
  | 'wallet'
  | 'x';

@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="paths[name()]" />
    </svg>
  `,
  host: { class: 'inline-block size-6 shrink-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();

  protected readonly paths: Readonly<Record<IconName, string>> = {
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    briefcase: 'M9 7V5h6v2m-11 3h16v9H4v-9Zm0 3c5 2 11 2 16 0',
    calculator: 'M6 3h12v18H6V3Zm3 4h6M9 12h.01M15 12h.01M9 16h.01M15 16h.01',
    calendar: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
    car: 'm5 16-1-3 2-5h12l2 5-1 3M6 16h12v3h-2v-2H8v2H6v-3Zm1-3h.01M17 13h.01',
    check: 'M20 6 9 17l-5-5',
    chevron: 'm9 18 6-6-6-6',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
    document: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6',
    home: 'm3 11 9-8 9 8v10h-6v-6H9v6H3V11Z',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01',
    menu: 'M4 7h16M4 12h16M4 17h16',
    money: 'M4 6h16v12H4V6Zm8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 9h.01M17 15h.01',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4',
    shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4',
    shop: 'M4 10v10h16V10M3 10l2-6h14l2 6M8 20v-6h4v6M3 10c1 2 3 2 4 0 1 2 3 2 5 0 1 2 3 2 5 0 1 2 3 2 4 0',
    spark:
      'm12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z',
    wallet:
      'M4 6h15a1 1 0 0 1 1 1v12H4a2 2 0 0 1-2-2V5m0 0a2 2 0 0 1 2-2h13v3H4a2 2 0 0 0-2 2m13 3h5v5h-5a2.5 2.5 0 0 1 0-5Z',
    x: 'M6 6l12 12M18 6 6 18',
  };
}
