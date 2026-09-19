import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CarritoItem {
  id: number;
  stock_inventario_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_codigo?: string;
  producto_nombre?: string;
  color_nombre?: string;
  talla_nombre?: string;
  sucursal_nombre?: string;
  foto?: string;
}

export interface Carrito {
  id: number;
  fecha: string;
  estado: string;
  codigo_cliente: string;
  items: CarritoItem[];
  total: number;
  created_at: string;
}

export interface CatalogoItem {
  codigo: string;
  nombre: string;
  descripcion?: string;
  foto?: string;
  precio: number;
  categoria_id: number;
  categoria_nombre?: string;
  temporada_id: number;
  temporada_nombre?: string;
  coleccion_id?: number;
  coleccion_nombre?: string;
  variantes: Array<{
    producto_color_id: number;
    color_id: number;
    color_nombre: string;
    color_hex?: string;
    existencias: Array<{
      stock_inventario_id: number;
      talla_id: number;
      talla_nombre?: string;
      sucursal_id: number;
      sucursal_ciudad?: string;
      cantidad: number;
    }>;
  }>;
  stock_total: number;
}

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/carrito`;
  private catalogoUrl = `${environment.apiUrl}/catalogo`;

  getMyCart(): Observable<Carrito> {
    return this.http.get<Carrito>(`${this.apiUrl}/mio`);
  }

  addItem(stockInventarioId: number, cantidad: number = 1): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.apiUrl}/items`, {
      stock_inventario_id: stockInventarioId,
      cantidad,
    });
  }

  updateItem(itemId: number, cantidad: number): Observable<Carrito> {
    return this.http.patch<Carrito>(`${this.apiUrl}/items/${itemId}`, { cantidad });
  }

  removeItem(itemId: number): Observable<Carrito> {
    return this.http.delete<Carrito>(`${this.apiUrl}/items/${itemId}`);
  }

  confirmarCarrito(data?: number | {
    sucursal_id?: number;
    metodo_pago?: string;
    direccion_envio?: string;
    despacho_yango?: boolean;
  }): Observable<{ message: string; orden_venta_id: number; total: number; estado: string }> {
    const payload = typeof data === 'number' ? { sucursal_id: data } : (data || {});
    return this.http.post<{ message: string; orden_venta_id: number; total: number; estado: string }>(
      `${this.apiUrl}/confirmar`,
      payload
    );
  }

  getCatalogo(filters?: {
    categoria_id?: number;
    temporada_id?: number;
    coleccion_id?: number;
    sucursal_id?: number;
    search?: string;
  }): Observable<CatalogoItem[]> {
    let params = new HttpParams();
    if (filters?.categoria_id) params = params.set('categoria_id', filters.categoria_id);
    if (filters?.temporada_id) params = params.set('temporada_id', filters.temporada_id);
    if (filters?.coleccion_id) params = params.set('coleccion_id', filters.coleccion_id);
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<CatalogoItem[]>(this.catalogoUrl, { params });
  }

  getProductoDetalle(codigo: string): Observable<CatalogoItem> {
    return this.http.get<CatalogoItem>(`${this.catalogoUrl}/${codigo}/detalle`);
  }

  getRecomendadosIA(codigo: string, limit: number = 4): Observable<any[]> {
    return this.http.get<any[]>(`${this.catalogoUrl}/${codigo}/recomendados?limit=${limit}`);
  }
}
