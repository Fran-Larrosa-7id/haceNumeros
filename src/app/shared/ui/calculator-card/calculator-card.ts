import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export interface CalculatorSummary {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly icon: IconName;
  readonly featured?: boolean;
  readonly available?: boolean;
}

@Component({
  selector: 'app-calculator-card',
  imports: [Icon],
  templateUrl: './calculator-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorCard {
  readonly calculator = input.required<CalculatorSummary>();
}
