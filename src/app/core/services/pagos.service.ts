import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
  mock?: boolean;
  orden_id?: number;
  orden_total_bob?: number;
  total?: number;
}

export interface CobroCajaResponse {
  pago_id: number;
  orden_venta_id: number;
  total: number;
  efectivo_recibido: number;
  cambio_devuelto: number;
  ticket_numero: string;
  fecha: string;
}

@Injectable({
  providedIn: 'root',
})
export class PagosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pagos`;

  crearOrdenPayPal(ordenVentaId: number, returnUrl?: string, cancelUrl?: string): Observable<PayPalOrderResponse> {
    return this.http.post<PayPalOrderResponse>(`${this.apiUrl}/paypal/crear-orden`, {
      orden_venta_id: ordenVentaId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    });
  }

  capturarOrdenPayPal(paypalOrderId: string, ordenVentaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/paypal/capturar-orden`, {
      paypal_order_id: paypalOrderId,
      orden_venta_id: ordenVentaId,
    });
  }

  cobrarEnCaja(ordenVentaId: number, efectivoRecibido: number, metodoPago: string = 'efectivo'): Observable<CobroCajaResponse> {
    return this.http.post<CobroCajaResponse>(`${this.apiUrl}/caja`, {
      orden_venta_id: ordenVentaId,
      efectivo_recibido: efectivoRecibido,
      metodo_pago: metodoPago,
    });
  }

  getRecibo(pagoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${pagoId}`);
  }

  getMisPagos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mios`);
  }

  getAllPagos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  confirmarOrdenOnline(ordenVentaId: number): Observable<CobroCajaResponse> {
    return this.http.post<CobroCajaResponse>(`${this.apiUrl}/confirmar-online/${ordenVentaId}`, {});
  }

  eliminarPago(pagoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${pagoId}`);
  }

  // --- QR Config (imagen de cobro presencial) ---

  getQRConfig(): Observable<QRConfigResponse> {
    return this.http.get<QRConfigResponse>(`${this.apiUrl}/config-qr`);
  }

  updateQRConfig(payload: QRConfigDTO): Observable<QRConfigResponse> {
    return this.http.post<QRConfigResponse>(`${this.apiUrl}/config-qr`, payload);
  }
}

export interface QRConfigResponse {
  id: number | null;
  imagen_url: string | null;
  banco_destino: string | null;
  titular: string | null;
  activo: boolean;
  updated_at: string | null;
}

export interface QRConfigDTO {
  imagen_url: string;
  banco_destino?: string;
  titular?: string;
  sucursal_id?: number;
}
