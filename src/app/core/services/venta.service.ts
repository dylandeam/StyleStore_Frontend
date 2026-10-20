import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdenVenta, VentaPresencialCreate, PagoResponse } from '../models/venta.model';
import { OfflineOperationsService, OfflineQueuedResult } from './offline-operations.service';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private http = inject(HttpClient);
  private offlineOperations = inject(OfflineOperationsService);
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

  createVentaPresencial(data: VentaPresencialCreate, snapshot?: unknown): Observable<OrdenVenta | OfflineQueuedResult> {
    const localPayload = { ...data, snapshot };
    return defer(() => {
      if (!navigator.onLine) return from(this.offlineOperations.queueCashSale(localPayload));
      return this.http.post<OrdenVenta>(`${this.apiUrl}/presencial`, data).pipe(
        catchError((error) => error?.status === 0
          ? from(this.offlineOperations.queueCashSale(localPayload))
          : throwError(() => error))
      );
    });
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
