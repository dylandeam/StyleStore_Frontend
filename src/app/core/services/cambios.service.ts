import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SolicitudCambioDevolucion {
  id: number;
  orden_venta_id: number;
  ticket_numero?: string;
  cliente_nombre?: string;
  cliente_email?: string;
  tipo: 'cambio' | 'devolucion';
  motivo: string;
  sucursal_id?: number;
  sucursal_nombre: string;
  fecha_programada: string;
  hora_programada?: string;
  descripcion_problema: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'completada';
  respuesta_encargado?: string;
  producto_original: string;
  color_original?: string;
  talla_original?: string;
  producto_nuevo?: string;
  talla_nueva?: string;
  color_nuevo?: string;
  created_at?: string;
  nuevo_stock_inventario_id?: number;
  precio_original?: number;
  precio_nuevo?: number;
  monto_adicional?: number;
  saldo_favor_generado?: number;
  monto_reembolsado?: number;
  metodo_pago_diferencia?: string;
  nota_venta_numero?: string;
  orden_ajuste_id?: number;
}

export interface InventarioCambio {
  stock_inventario_id: number;
  producto_codigo: string;
  producto_nombre: string;
  color_nombre?: string;
  talla_nombre?: string;
  precio: number;
  cantidad: number;
}

export interface SolicitudCambioCreate {
  orden_venta_id: number;
  detalle_venta_id?: number;
  tipo: 'cambio' | 'devolucion';
  motivo: string;
  descripcion?: string;
  sucursal_id?: number;
  fecha_programada?: string;
  producto_detalle_id?: number;
  talla_solicitada?: string;
  color_solicitado?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CambiosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cambios`;

  solicitarCambio(payload: {
    orden_venta_id: number;
    detalle_venta_id: number;
    tipo: string;
    motivo: string;
    sucursal_id: number;
    fecha_programada: string;
    hora_programada?: string;
    descripcion_problema: string;
    producto_nuevo_codigo?: string;
    talla_nueva_id?: number;
    color_nuevo_id?: number;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  getMisSolicitudes(): Observable<SolicitudCambioDevolucion[]> {
    return this.http.get<SolicitudCambioDevolucion[]>(`${this.apiUrl}/mis-solicitudes`);
  }

  listarSolicitudesStaff(sucursalId?: number, estado?: string): Observable<SolicitudCambioDevolucion[]> {
    let params = new HttpParams();
    if (sucursalId !== undefined && sucursalId !== null) {
      params = params.set('sucursal_id', sucursalId.toString());
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<SolicitudCambioDevolucion[]>(this.apiUrl, { params });
  }

  responderSolicitud(solicitudId: number, nuevoEstado: string, respuesta: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${solicitudId}/responder`, {
      nuevo_estado: nuevoEstado,
      respuesta_encargado: respuesta,
    });
  }

  completarEnCaja(solicitudId: number, data: {
    reponer_prenda_original: boolean;
    nuevo_stock_inventario_id?: number;
    metodo_pago_diferencia?: 'efectivo' | 'qr';
    efectivo_recibido?: number;
    metodo_reembolso?: 'efectivo' | 'transferencia';
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${solicitudId}/completar`, {
      ...data,
    });
  }

  getPolitica(): Observable<{ plazo_cambios_dias: number }> {
    return this.http.get<{ plazo_cambios_dias: number }>(`${this.apiUrl}/politica`);
  }

  updatePolitica(plazo: number): Observable<{ plazo_cambios_dias: number; message: string }> {
    return this.http.put<{ plazo_cambios_dias: number; message: string }>(`${this.apiUrl}/politica`, { plazo_cambios_dias: plazo });
  }

  getInventarioDisponible(sucursalId: number): Observable<InventarioCambio[]> {
    return this.http.get<InventarioCambio[]>(`${this.apiUrl}/inventario-disponible`, { params: { sucursal_id: sucursalId } });
  }

  getMiSaldo(): Observable<{ saldo: number; movimientos: any[] }> {
    return this.http.get<{ saldo: number; movimientos: any[] }>(`${this.apiUrl}/mi-saldo`);
  }

  getOpcionesDisponibles(productoCodigo: string, sucursalId: number): Observable<{ colores: any[]; tallas: any[] }> {
    const params = new HttpParams()
      .set('producto_codigo', productoCodigo)
      .set('sucursal_id', sucursalId.toString());
    return this.http.get<{ colores: any[]; tallas: any[] }>(`${this.apiUrl}/opciones-disponibles`, { params });
  }
}
