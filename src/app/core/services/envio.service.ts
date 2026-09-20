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

  /** Actualizar tracking de Delivery StyleStore */
  updateDeliveryTracking(id: number, data: any): Observable<Envio> {
    return this.http.patch<Envio>(`${this.apiUrl}/${id}/delivery`, data);
  }

  /** Compat alias — redirige al nuevo endpoint */
  updateYangoTracking(id: number, data: any): Observable<Envio> {
    return this.updateDeliveryTracking(id, data);
  }

  getEnvioByOrden(ordenId: number): Observable<Envio> {
    return this.http.get<Envio>(`${this.apiUrl}/orden/${ordenId}`);
  }

  deleteEnvio(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  cotizarPorDistancia(data: { sucursal_id?: number; lat?: number; lon?: number; direccion?: string; ciudad?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizar-distancia`, data);
  }

  getEnviosAsignados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asignados`);
  }

  asignarRepartidor(envioId: number, repartidorId?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${envioId}/asignar`, { repartidor_id: repartidorId });
  }

  actualizarPosicion(envioId: number, lat: number, lon: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${envioId}/posicion`, { lat, lon });
  }

  actualizarEstado(envioId: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${envioId}/estado`, { estado });
  }

  getTrackingMap(envioId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${envioId}/tracking`);
  }

  // ─── ENDPOINTS PÚBLICOS PARA CONDUCTOR Y CLIENTE (sin auth) ───

  /** Obtener datos del pedido para el conductor (público) */
  getPublicConductor(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/conductor/${token}`);
  }

  /** Enviar posición GPS del conductor (público) */
  reportarPosicionConductor(token: string, lat: number, lon: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/public/conductor/${token}/posicion`, { lat, lon });
  }

  /** Marcar como entregado por el conductor (público) */
  marcarEntregadoConductor(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/public/conductor/${token}/entregar`, {});
  }

  /** Obtener datos de rastreo para el cliente (público) */
  getRastreoCliente(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/rastreo/${token}`);
  }
}
