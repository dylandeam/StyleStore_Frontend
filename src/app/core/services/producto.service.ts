import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoCreate, ProductoUpdate } from '../models/producto.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/productos`;

  getProductos(filters?: {
    categoria_id?: number;
    temporada_id?: number;
    search?: string;
    active_only?: boolean;
  }): Observable<Producto[]> {
    let params = new HttpParams();
    if (filters?.categoria_id) params = params.set('categoria_id', filters.categoria_id.toString());
    if (filters?.temporada_id) params = params.set('temporada_id', filters.temporada_id.toString());
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.active_only) params = params.set('active_only', 'true');

    return this.http.get<Producto[]>(this.apiUrl, { params });
  }

  getProducto(codigo: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${codigo}`);
  }

  createProducto(data: ProductoCreate): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, data);
  }

  updateProducto(codigo: string, data: ProductoUpdate): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${codigo}`, data);
  }

  deleteProducto(codigo: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${codigo}`);
  }
}
