import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoCreate } from '../models/producto.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/productos`;

  getProductos(filters?: {
    category?: string;
    search?: string;
    active_only?: boolean;
  }): Observable<Producto[]> {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.active_only) params = params.set('active_only', 'true');

    return this.http.get<Producto[]>(this.apiUrl, { params });
  }

  getProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  createProducto(data: ProductoCreate): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, data);
  }

  updateProducto(id: number, data: Partial<ProductoCreate>): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, data);
  }

  deleteProducto(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
