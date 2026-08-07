import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SalaryParameters } from '../domain/salary-calculation.models';

@Injectable({ providedIn: 'root' })
export class SalaryParametersRepository {
  private readonly http = inject(HttpClient);
  private cached: Promise<SalaryParameters> | null = null;

  getParameters(): Promise<SalaryParameters> {
    return (this.cached ??= firstValueFrom(
      this.http.get<SalaryParameters>('data/salary/parameters.json'),
    ).then((value) => this.assertContract(value)));
  }

  private assertContract(value: SalaryParameters): SalaryParameters {
    const rate = value.rates.retirement + value.rates.healthInsurance + value.rates.inssjp;
    if (
      value.schemaVersion !== 1 ||
      value.type !== 'salary-general-regime' ||
      value.country !== 'AR' ||
      !Number.isFinite(rate) ||
      Math.abs(rate - 0.17) > 1e-12 ||
      !(value.contributionBase.maximum > value.contributionBase.minimum) ||
      value.contributionBase.minimumAppliedByCalculator !== false
    ) {
      throw new Error('Contrato de parámetros salariales inválido.');
    }
    return value;
  }
}
