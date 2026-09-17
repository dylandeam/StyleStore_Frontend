import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Envio, EnvioCreate, EnvioUpdate } from '../models/envio.model';

@Injectable({
  providedIn: 'root',
})
export class EnvioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/envios`;

  getEnvios(): Observable<Envio[]> {
    return this.http.get<Envio[]>(this.apiUrl);
  }

  cotizar(distanciaKm: number): Observable<{ distancia_km: number; costo: number; moneda: string }> {
    return this.http.post<{ distancia_km: number; costo: number; moneda: string }>(
      `${this.apiUrl}/cotizar`,
      { distancia_km: distanciaKm }
    );
  }

  createEnvio(data: EnvioCreate): Observable<Envio> {
    return this.http.post<Envio>(this.apiUrl, data);
  }

  updateEnvio(id: number, data: EnvioUpdate): Observable<Envio> {
    return this.http.put<Envio>(`${this.apiUrl}/${id}`, data);
  }

  completarEnvio(id: number): Observable<Envio> {
    return this.http.patch<Envio>(`${this.apiUrl}/${id}/completar`, {});
  }

  updateYangoTracking(id: number, data: any): Observable<Envio> {
    return this.http.patch<Envio>(`${this.apiUrl}/${id}/yango`, data);
  }

  getEnvioByOrden(ordenId: number): Observable<Envio> {
    return this.http.get<Envio>(`${this.apiUrl}/orden/${ordenId}`);
  }

  deleteEnvio(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
