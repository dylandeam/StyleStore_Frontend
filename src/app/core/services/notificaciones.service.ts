import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificacionItem {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url_accion?: string;
  created_at?: string;
}

export interface MisNotificacionesResponse {
  items: NotificacionItem[];
  total_no_leidas: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notificaciones`;

  getMisNotificaciones(limit = 30, offset = 0): Observable<MisNotificacionesResponse> {
    return this.http.get<MisNotificacionesResponse>(`${this.apiUrl}/mis-notificaciones`, {
      params: { limit: limit.toString(), offset: offset.toString() },
    });
  }

  getNoLeidasCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/no-leidas-count`);
  }

  marcarLeida(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/leer-todas`, {});
  }

  suscribirProximamente(proximamenteId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/suscribir-proximamente`, {
      proximamente_id: proximamenteId,
    });
  }

  suscribirStock(stockInventarioId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/suscribir-stock`, {
      stock_inventario_id: stockInventarioId,
    });
  }
}
