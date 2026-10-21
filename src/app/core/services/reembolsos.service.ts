import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoReembolso = 'pendiente' | 'entregado' | 'cancelado';

export interface ReembolsoOffline {
  id: number;
  operation_uuid: string;
  empresa_id: number;
  user_id: number;
  sucursal_id: number | null;
  monto: number;
  moneda: string;
  metodo_original: string;
  estado: EstadoReembolso;
  motivo: string;
  observaciones?: string;
  procesado_por?: number;
  procesado_at?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ReembolsosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reembolsos`;

  listar(estado?: EstadoReembolso): Observable<ReembolsoOffline[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<ReembolsoOffline[]>(this.url, { params });
  }

  resolver(id: number, estado: Exclude<EstadoReembolso, 'pendiente'>, observaciones: string): Observable<ReembolsoOffline> {
    return this.http.put<ReembolsoOffline>(`${this.url}/${id}`, { estado, observaciones });
  }
}
