import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantAdmin, TenantCreate, TenantSubscription, TenantSummary } from '../models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/empresas`;

  list(): Observable<TenantSummary[]> {
    return this.http.get<TenantSummary[]>(`${this.url}/resumen`);
  }

  create(payload: TenantCreate): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.url, payload);
  }

  update(id: number, payload: { codigo?: string; nombre?: string }): Observable<TenantSummary> {
    return this.http.patch<TenantSummary>(`${this.url}/${id}`, payload);
  }

  setActive(id: number, active: boolean): Observable<TenantSummary> {
    return this.http.put<TenantSummary>(`${this.url}/${id}/estado`, { active });
  }

  updateAdmin(
    id: number,
    payload: { name?: string; email?: string; password?: string; is_active?: boolean },
  ): Observable<TenantAdmin> {
    return this.http.put<TenantAdmin>(`${this.url}/${id}/administrador`, payload);
  }

  updateSubscription(
    id: number,
    payload: {
      plan_codigo: string;
      estado: string;
      fecha_inicio: string;
      fecha_fin: string;
      pago_confirmado: boolean;
      referencia_pago?: string;
    },
  ): Observable<TenantSubscription> {
    return this.http.put<TenantSubscription>(`${this.url}/${id}/suscripcion`, payload);
  }
}
