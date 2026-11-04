import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SyncOperationStatus = 'procesando' | 'confirmada' | 'rechazada' | 'conflicto';
export type SyncOperationType = 'reserva' | 'venta_efectivo' | 'resena_producto';

export interface SyncAdminOperation {
  operation_uuid: string;
  operation_type: SyncOperationType;
  status: SyncOperationStatus;
  user_id: number;
  user_name: string;
  user_email: string;
  sucursal_id: number | null;
  sucursal_nombre: string | null;
  client_created_at: string;
  created_at: string;
  updated_at: string;
  reason: string | null;
  result_type: string | null;
  result_id: number | null;
  resultado_notificado: boolean;
  refund_id: number | null;
  refund_status: string | null;
  refund_amount: number | null;
  refund_currency: string | null;
  refund_reason: string | null;
}

export interface SyncAdminOperationsResponse {
  total: number;
  limit: number;
  offset: number;
  items: SyncAdminOperation[];
}

export interface SyncMetrics {
  empresa_id: number;
  total_operaciones: number;
  total_confirmadas: number;
  total_conflictos: number;
  total_rechazadas: number;
  total_procesando: number;
  tasa_exito_porcentaje: number;
  operaciones_por_tipo: Record<string, number>;
  reembolsos_asociados: {
    total_reembolsos: number;
    monto_total: number;
    pendientes: number;
    entregados: number;
  };
}

export interface SyncAdminFilters {
  status?: string;
  operationType?: string;
  sucursalId?: number | null;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class SyncAdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sync`;

  list(filters: SyncAdminFilters): Observable<SyncAdminOperationsResponse> {
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? 50))
      .set('offset', String(filters.offset ?? 0));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.operationType) params = params.set('operation_type', filters.operationType);
    if (filters.sucursalId) params = params.set('sucursal_id', filters.sucursalId);
    return this.http.get<SyncAdminOperationsResponse>(`${this.url}/admin/operations`, { params });
  }

  metrics(sucursalId?: number | null): Observable<SyncMetrics> {
    const params = sucursalId ? new HttpParams().set('sucursal_id', sucursalId) : undefined;
    return this.http.get<SyncMetrics>(`${this.url}/metricas`, { params });
  }
}
