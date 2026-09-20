import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Compra, CompraCreate } from '../models/compra.model';

@Injectable({
  providedIn: 'root',
})
export class CompraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/compras`;

  getCompras(filters?: { sucursal_id?: number; proveedor_codigo?: string; estado?: string }): Observable<Compra[]> {
    let params = new HttpParams();
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id.toString());
    if (filters?.proveedor_codigo) params = params.set('proveedor_codigo', filters.proveedor_codigo);
    if (filters?.estado) params = params.set('estado', filters.estado);
    return this.http.get<Compra[]>(this.apiUrl, { params });
  }

  getCompra(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.apiUrl}/${id}`);
  }

  createCompra(payload: CompraCreate): Observable<Compra> {
    return this.http.post<Compra>(this.apiUrl, payload);
  }

  anularCompra(id: number): Observable<Compra> {
    return this.http.post<Compra>(`${this.apiUrl}/${id}/anular`, {});
  }
}
