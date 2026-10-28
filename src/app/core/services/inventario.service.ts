import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, from, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoTraspaso,
  InventarioItem,
  RecomendacionesTraspasoResponse,
  StockAdjustRequest,
  TraspasoCreateRequest,
  TraspasoInventario,
} from '../models/inventario.model';
import { AuthService } from './auth.service';
import { OfflineDbService } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private offlineDb = inject(OfflineDbService);
  private offlineState = inject(OfflineStateService);
  private apiUrl = `${environment.apiUrl}/inventario`;
  private reportesUrl = `${environment.apiUrl}/reportes`;

  getInventarioGlobal(filters?: {
    categoria_id?: number;
    temporada_id?: number;
    coleccion_id?: number;
    search?: string;
  }): Observable<InventarioItem[]> {
    let params = new HttpParams();
    if (filters?.categoria_id) params = params.set('categoria_id', filters.categoria_id);
    if (filters?.temporada_id) params = params.set('temporada_id', filters.temporada_id);
    if (filters?.coleccion_id) params = params.set('coleccion_id', filters.coleccion_id);
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<InventarioItem[]>(`${this.apiUrl}/global`, { params });
  }

  getInventarioSucursal(sucursalId: number): Observable<InventarioItem[]> {
    const scope = this.offlineScope();
    const filterKey = `pos-inventario:sucursal-${sucursalId}`;
    return this.http.get<InventarioItem[]>(`${this.apiUrl}/sucursal/${sucursalId}`).pipe(
      tap((items) => {
        this.offlineState.usingCachedCatalog.set(false);
        void this.offlineDb
          .putCatalog(scope, filterKey, items)
          .then((snapshot) => this.offlineState.lastCatalogSync.set(snapshot.syncedAt))
          .catch(() => undefined);
      }),
      catchError((requestError) =>
        from(this.offlineDb.getCatalog<InventarioItem[]>(scope, filterKey)).pipe(
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

  ajustarStock(data: StockAdjustRequest): Observable<{ message: string; stock_inventario_id: number; cantidad: number }> {
    return this.http.post<{ message: string; stock_inventario_id: number; cantidad: number }>(
      `${this.apiUrl}/ajustar`,
      data
    );
  }

  getTraspasos(estado?: EstadoTraspaso): Observable<TraspasoInventario[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<TraspasoInventario[]>(`${this.apiUrl}/traspasos`, { params });
  }

  crearTraspaso(data: TraspasoCreateRequest): Observable<TraspasoInventario> {
    return this.http.post<TraspasoInventario>(`${this.apiUrl}/traspasos`, data);
  }

  decidirTraspaso(
    id: number,
    accion: 'aprobar' | 'rechazar' | 'cancelar',
    respuesta?: string
  ): Observable<TraspasoInventario> {
    return this.http.post<TraspasoInventario>(`${this.apiUrl}/traspasos/${id}/${accion}`, {
      respuesta: respuesta || null,
    });
  }

  getRecomendacionesTraspaso(sucursalId?: number | null): Observable<RecomendacionesTraspasoResponse> {
    const params = sucursalId ? new HttpParams().set('sucursal_id', sucursalId) : undefined;
    return this.http.get<RecomendacionesTraspasoResponse>(
      `${this.reportesUrl}/recomendaciones-traspaso-stock`,
      { params }
    );
  }

  private offlineScope(): string {
    const user = this.auth.currentUser();
    return user ? `empresa-${user.empresa_id ?? 'plataforma'}:usuario-${user.id}` : 'publico';
  }
}
