import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, from, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sucursal, SucursalCreate } from '../models/sucursal.model';
import { MessageResponse } from '../models/auth.model';
import { AuthService } from './auth.service';
import { OfflineDbService } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';

@Injectable({
  providedIn: 'root',
})
export class SucursalService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private offlineDb = inject(OfflineDbService);
  private offlineState = inject(OfflineStateService);
  private apiUrl = `${environment.apiUrl}/sucursales`;

  getSucursales(activeOnly: boolean = false): Observable<Sucursal[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('active_only', 'true');
    }
    const scope = this.offlineScope();
    const filterKey = `sucursales:${activeOnly ? 'activas' : 'todas'}`;
    return this.http.get<Sucursal[]>(this.apiUrl, { params }).pipe(
      tap((items) => {
        void this.offlineDb.putCatalog(scope, filterKey, items).catch(() => undefined);
      }),
      catchError((requestError) =>
        from(this.offlineDb.getCatalog<Sucursal[]>(scope, filterKey)).pipe(
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

  getSucursal(id: number): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${this.apiUrl}/${id}`);
  }

  createSucursal(data: SucursalCreate): Observable<Sucursal> {
    return this.http.post<Sucursal>(this.apiUrl, data);
  }

  updateSucursal(id: number, data: Partial<SucursalCreate>): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.apiUrl}/${id}`, data);
  }

  deleteSucursal(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }

  private offlineScope(): string {
    const user = this.auth.currentUser();
    return user ? `empresa-${user.empresa_id ?? 'plataforma'}:usuario-${user.id}` : 'publico';
  }
}
