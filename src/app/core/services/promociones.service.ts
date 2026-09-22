import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, PromocionUpdate } from '../models/producto.model';

@Injectable({
  providedIn: 'root',
})
export class PromocionesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/promociones`;

  /** Obtener productos en promoción activa (Vista Cliente / Pública) */
  getPromocionesActivas(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  /** Obtener todos los productos con su estado promocional (Consola Administración) */
  getTodasLasPromociones(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/todas`);
  }

  /** Actualizar estado, porcentaje y título de promoción de un producto */
  updatePromocion(codigo: string, data: PromocionUpdate): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${codigo}`, data);
  }
}
