import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reserva, ReservaCreate } from '../models/reserva.model';
import { OfflineOperationsService, OfflineQueuedResult } from './offline-operations.service';

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  private http = inject(HttpClient);
  private offlineOperations = inject(OfflineOperationsService);
  private apiUrl = `${environment.apiUrl}/reservas`;

  getReservas(filters?: { sucursal_id?: number | null; estado?: string | null }): Observable<Reserva[]> {
    let params = new HttpParams();
    if (filters?.sucursal_id) {
      params = params.set('sucursal_id', filters.sucursal_id.toString());
    }
    if (filters?.estado) {
      params = params.set('estado', filters.estado);
    }
    return this.http.get<Reserva[]>(this.apiUrl, { params });
  }

  getMyReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/mias`);
  }

  createReserva(data: ReservaCreate): Observable<Reserva | OfflineQueuedResult> {
    return defer(() => {
      if (!navigator.onLine) return from(this.offlineOperations.queueReservation(data));
      return this.http.post<Reserva>(this.apiUrl, data).pipe(
        catchError((error) => error?.status === 0
          ? from(this.offlineOperations.queueReservation(data))
          : throwError(() => error))
      );
    });
  }

  cancelarReserva(reservaId: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/${reservaId}/cancelar`, {});
  }

  updateEstado(reservaId: number, estado: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${reservaId}/estado`, { estado });
  }

  deleteReserva(reservaId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${reservaId}`);
  }

  checkElegibilidad(): Observable<{ puede_reservar: boolean; compras_previas: number; mensaje: string }> {
    return this.http.get<{ puede_reservar: boolean; compras_previas: number; mensaje: string }>(
      `${this.apiUrl}/elegibilidad`
    );
  }
}
