import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
  mock?: boolean;
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

  cobrarEnCaja(ordenVentaId: number, efectivoRecibido: number): Observable<CobroCajaResponse> {
    return this.http.post<CobroCajaResponse>(`${this.apiUrl}/caja`, {
      orden_venta_id: ordenVentaId,
      efectivo_recibido: efectivoRecibido,
    });
  }

  getRecibo(pagoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${pagoId}`);
  }

  getMisPagos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mios`);
  }
}
