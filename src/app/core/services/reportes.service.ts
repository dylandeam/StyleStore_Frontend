import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;

  exportarVentasExcel(filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    sucursal_id?: number;
    metodo_pago?: string;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.metodo_pago) params = params.set('metodo_pago', filters.metodo_pago);

    return this.http.get(`${this.apiUrl}/ventas/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportarVentasPDF(filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    sucursal_id?: number;
    metodo_pago?: string;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.metodo_pago) params = params.set('metodo_pago', filters.metodo_pago);

    return this.http.get(`${this.apiUrl}/ventas/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  exportarInventarioExcel(filters?: {
    sucursal_id?: number;
    solo_bajo_stock?: boolean;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.solo_bajo_stock) params = params.set('solo_bajo_stock', filters.solo_bajo_stock);

    return this.http.get(`${this.apiUrl}/inventario/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportarInventarioPDF(filters?: {
    sucursal_id?: number;
    solo_bajo_stock?: boolean;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.solo_bajo_stock) params = params.set('solo_bajo_stock', filters.solo_bajo_stock);

    return this.http.get(`${this.apiUrl}/inventario/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  previewVentas(filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    sucursal_id?: number;
    metodo_pago?: string;
  }): Observable<{ total_registros: number; total_monto: number; items: any[] }> {
    let params = new HttpParams();
    if (filters?.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.metodo_pago) params = params.set('metodo_pago', filters.metodo_pago);

    return this.http.get<{ total_registros: number; total_monto: number; items: any[] }>(
      `${this.apiUrl}/ventas/preview`,
      { params }
    );
  }

  previewInventario(filters?: {
    sucursal_id?: number;
    solo_bajo_stock?: boolean;
  }): Observable<{ total_registros: number; total_criticos: number; items: any[] }> {
    let params = new HttpParams();
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.solo_bajo_stock) params = params.set('solo_bajo_stock', filters.solo_bajo_stock);

    return this.http.get<{ total_registros: number; total_criticos: number; items: any[] }>(
      `${this.apiUrl}/inventario/preview`,
      { params }
    );
  }
}

