import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoTraspaso,
  InventarioItem,
  StockAdjustRequest,
  TraspasoCreateRequest,
  TraspasoInventario,
} from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventario`;

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
    return this.http.get<InventarioItem[]>(`${this.apiUrl}/sucursal/${sucursalId}`);
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
}
