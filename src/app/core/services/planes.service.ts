import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EmpresaOption, PlanContract, SubscriptionPlan } from '../models/plan.model';

@Injectable({ providedIn: 'root' })
export class PlanesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getPublicPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/planes`);
  }

  getAdminPlans(empresaId?: number): Observable<SubscriptionPlan[]> {
    const params = empresaId ? new HttpParams().set('empresa_id', empresaId) : undefined;
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/planes/admin`, { params });
  }

  updatePlan(code: string, payload: Partial<SubscriptionPlan>, empresaId?: number): Observable<SubscriptionPlan> {
    const params = empresaId ? new HttpParams().set('empresa_id', empresaId) : undefined;
    return this.http.put<SubscriptionPlan>(`${this.apiUrl}/planes/admin/${code}`, payload, { params });
  }

  contractPlan(code: string): Observable<PlanContract> {
    return this.http.post<PlanContract>(`${this.apiUrl}/planes/contratar`, { plan_codigo: code });
  }

  getMyContract(): Observable<PlanContract | null> {
    return this.http.get<PlanContract | null>(`${this.apiUrl}/planes/mi-contratacion`);
  }

  getCompanies(): Observable<EmpresaOption[]> {
    return this.http.get<EmpresaOption[]>(`${this.apiUrl}/empresas`);
  }
}
