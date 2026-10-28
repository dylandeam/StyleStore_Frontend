import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, from, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { OfflineDbService } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';

export interface CarritoItem {
  id: number;
  stock_inventario_id: number;
  cantidad: number;
  precio_unitario: number;
  precio_original?: number;
  porcentaje_promocion?: number;
  subtotal: number;
  producto_codigo?: string;
  producto_nombre?: string;
  color_nombre?: string;
  talla_nombre?: string;
  sucursal_id?: number;
  sucursal_nombre?: string;
  sucursal_ciudad?: string;
  sucursal_direccion?: string;
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

export interface CheckoutResponse {
  message: string;
  orden_venta_id: number;
  total: number;
  estado: string;
  costo_envio: number;
  token_seguimiento?: string | null;
  tracking_url?: string | null;
}

export interface CatalogoItem {
  codigo: string;
  nombre: string;
  descripcion?: string;
  foto?: string;
  foto_trasera?: string;
  foto_vestidor_frontal?: string;
  foto_vestidor_trasera?: string;
  tipo_prenda?: string;
  precio: number;
  categoria_id: number;
  categoria_nombre?: string;
  temporada_id: number;
  temporada_nombre?: string;
  coleccion_id?: number;
  coleccion_nombre?: string;
  en_promocion?: boolean;
  porcentaje_descuento?: number;
  precio_descuento?: number | null;
  titulo_promocion?: string | null;
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
      sucursal_nombre?: string;
      sucursal_ciudad?: string;
      cantidad: number;
      precio: number;
      precio_original?: number;
      precio_variante?: number | null;
      medidas?: Record<string, number>;
    }>;
  }>;
  stock_total: number;
  es_favorito?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private offlineDb = inject(OfflineDbService);
  private offlineState = inject(OfflineStateService);
  private apiUrl = `${environment.apiUrl}/carrito`;
  private catalogoUrl = `${environment.apiUrl}/catalogo`;
  private favoritosUrl = `${environment.apiUrl}/favoritos`;

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
    despacho_delivery?: boolean;
    despacho_yango?: boolean;
    tipo_entrega?: 'delivery' | 'recojo';
    fecha_recojo?: string;
    hora_recojo?: string;
    codigo_descuento?: string;
  }): Observable<{ message: string; orden_venta_id: number; total: number; estado: string }> {
    const payload = typeof data === 'number' ? { sucursal_id: data } : (data || {});
    return this.http.post<{ message: string; orden_venta_id: number; total: number; estado: string }>(
      `${this.apiUrl}/confirmar`,
      payload
    );
  }

  checkout(data: {
    metodo_pago: string;
    distancia_km?: number;
    direccion_envio?: string;
    latitud_destino?: number;
    longitud_destino?: number;
    ubicacion_url?: string;
    ciudad?: string;
    referencia?: string;
    sucursal_id?: number;
    tipo_entrega?: 'delivery' | 'recojo';
    fecha_recojo?: string;
    hora_recojo?: string;
    codigo_descuento?: string;
  }): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout`, data);
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

    const scope = this.offlineScope();
    const filterKey = this.catalogFilterKey(filters);
    return this.http.get<CatalogoItem[]>(this.catalogoUrl, { params }).pipe(
      tap((data) => {
        this.offlineState.usingCachedCatalog.set(false);
        void this.offlineDb
          .putCatalog(scope, filterKey, data)
          .then((snapshot) => this.offlineState.lastCatalogSync.set(snapshot.syncedAt))
          .catch(() => undefined);
      }),
      catchError((requestError) =>
        from(this.offlineDb.getCatalog<CatalogoItem[]>(scope, filterKey)).pipe(
          switchMap((snapshot) => snapshot ? from([snapshot]) : throwError(() => requestError)),
          tap((snapshot) => {
            this.offlineState.usingCachedCatalog.set(true);
            this.offlineState.lastCatalogSync.set(snapshot.syncedAt);
          }),
          map((snapshot) => snapshot.data)
        )
      )
    );
  }

  downloadCatalogPdf(filters?: {
    categoria_id?: number;
    temporada_id?: number;
    coleccion_id?: number;
    sucursal_id?: number;
    search?: string;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.categoria_id) params = params.set('categoria_id', filters.categoria_id);
    if (filters?.temporada_id) params = params.set('temporada_id', filters.temporada_id);
    if (filters?.coleccion_id) params = params.set('coleccion_id', filters.coleccion_id);
    if (filters?.sucursal_id) params = params.set('sucursal_id', filters.sucursal_id);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get(`${this.catalogoUrl}/exportar-pdf`, { params, responseType: 'blob' });
  }

  private offlineScope(): string {
    const user = this.auth.currentUser();
    return user ? `empresa-${user.empresa_id ?? 'plataforma'}:usuario-${user.id}` : 'publico';
  }

  private catalogFilterKey(filters?: Record<string, number | string | undefined>): string {
    return Object.entries(filters ?? {})
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${String(value).toLowerCase()}`)
      .join('&') || 'todos';
  }

  getProductoDetalle(codigo: string, sucursalId?: number): Observable<CatalogoItem> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId);
    return this.http.get<CatalogoItem>(`${this.catalogoUrl}/${codigo}/detalle`, { params });
  }

  agregarFavorito(codigo: string): Observable<{ producto_codigo: string; es_favorito: boolean }> {
    return this.http.post<{ producto_codigo: string; es_favorito: boolean }>(
      `${this.favoritosUrl}/${encodeURIComponent(codigo)}`,
      {}
    );
  }

  quitarFavorito(codigo: string): Observable<{ producto_codigo: string; es_favorito: boolean }> {
    return this.http.delete<{ producto_codigo: string; es_favorito: boolean }>(
      `${this.favoritosUrl}/${encodeURIComponent(codigo)}`
    );
  }

  getRecomendadosIA(codigo: string, limit: number = 4): Observable<any[]> {
    return this.http.get<any[]>(`${this.catalogoUrl}/${codigo}/recomendados?limit=${limit}`);
  }

  getParaTiIA(limit: number = 6): Observable<any[]> {
    return this.http.get<any[]>(`${this.catalogoUrl}/para-ti?limit=${limit}`);
  }
}
