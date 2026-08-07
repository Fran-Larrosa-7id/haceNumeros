import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

export interface CalculatorSummary {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly icon: IconName;
  readonly featured?: boolean;
  readonly route?: string;
}

@Component({
  selector: 'app-calculator-card',
  imports: [Icon, RouterLink],
  templateUrl: './calculator-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorCard {
  readonly calculator = input.required<CalculatorSummary>();
}
