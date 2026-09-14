import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdenVenta, VentaPresencialCreate, PagoResponse } from '../models/venta.model';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ventas`;
  private pagosUrl = `${environment.apiUrl}/pagos`;

  getVentas(): Observable<OrdenVenta[]> {
    return this.http.get<OrdenVenta[]>(this.apiUrl);
  }

  getMyPurchases(): Observable<{ compras_carrito: OrdenVenta[]; compras_presenciales: OrdenVenta[] }> {
    return this.http.get<{ compras_carrito: OrdenVenta[]; compras_presenciales: OrdenVenta[] }>(
      `${this.apiUrl}/mias`
    );
  }

  getVenta(id: number): Observable<OrdenVenta> {
    return this.http.get<OrdenVenta>(`${this.apiUrl}/${id}`);
  }

  createVentaPresencial(data: VentaPresencialCreate): Observable<OrdenVenta> {
    return this.http.post<OrdenVenta>(`${this.apiUrl}/presencial`, data);
  }

  deleteVenta(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  procesarPago(ordenVentaId: number, tipoPago: string = 'en linea', paypalOrderId?: string): Observable<PagoResponse> {
    return this.http.post<PagoResponse>(this.pagosUrl, {
      orden_venta_id: ordenVentaId,
      tipo_pago: tipoPago,
      paypal_order_id: paypalOrderId,
    });
  }

  getRecibo(pagoId: number): Observable<any> {
    return this.http.get<any>(`${this.pagosUrl}/${pagoId}`);
  }
}
