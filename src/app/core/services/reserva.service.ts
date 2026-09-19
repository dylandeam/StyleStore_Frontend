import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reserva, ReservaCreate } from '../models/reserva.model';

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reservas`;

  getReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(this.apiUrl);
  }

  getMyReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/mias`);
  }

  createReserva(data: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(this.apiUrl, data);
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
