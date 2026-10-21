import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, PromocionUpdate } from '../models/producto.model';

export interface PromocionAgrupada {
  id: number;
  empresa_id: number;
  nombre: string;
  tipo: 'categoria' | 'temporada';
  categoria_id?: number | null;
  temporada_id?: number | null;
  categoria_nombre?: string | null;
  temporada_nombre?: string | null;
  porcentaje: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  active: boolean;
}

export interface CodigoDescuento {
  id: number;
  empresa_id: number;
  codigo: string;
  descripcion?: string | null;
  porcentaje: number;
  aplica_online: boolean;
  aplica_presencial: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  max_usos?: number | null;
  usos_actual: number;
  active: boolean;
}

export interface CodigoValidado {
  valido: boolean;
  codigo: string;
  porcentaje: number;
  descripcion?: string | null;
}

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

  getAgrupadas(): Observable<PromocionAgrupada[]> {
    return this.http.get<PromocionAgrupada[]>(`${this.apiUrl}/agrupadas`);
  }

  createAgrupada(data: Omit<PromocionAgrupada, 'id' | 'empresa_id'>): Observable<PromocionAgrupada> {
    return this.http.post<PromocionAgrupada>(`${this.apiUrl}/agrupadas`, data);
  }

  deleteAgrupada(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/agrupadas/${id}`);
  }

  getCodigos(): Observable<CodigoDescuento[]> {
    return this.http.get<CodigoDescuento[]>(`${this.apiUrl}/codigos`);
  }

  createCodigo(data: Omit<CodigoDescuento, 'id' | 'empresa_id' | 'usos_actual'>): Observable<CodigoDescuento> {
    return this.http.post<CodigoDescuento>(`${this.apiUrl}/codigos`, data);
  }

  deleteCodigo(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/codigos/${id}`);
  }

  validarCodigo(codigo: string, canal: 'online' | 'presencial'): Observable<CodigoValidado> {
    return this.http.post<CodigoValidado>(`${this.apiUrl}/codigos/validar`, { codigo, canal });
  }
}
