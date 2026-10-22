import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CalificacionServicio {
  id: number; empresa_id: number; empresa_nombre?: string; user_id: number;
  cliente_nombre?: string; orden_venta_id: number; sucursal_id?: number;
  sucursal_nombre?: string; puntuacion: number; comentario?: string;
  created_at: string; sugerir_reclamo: boolean; mensaje?: string;
}

export interface Reclamo {
  id: number; empresa_id: number; empresa_nombre?: string; user_id: number;
  cliente_nombre?: string; orden_venta_id?: number; calificacion_id?: number;
  sucursal_id: number; sucursal_nombre?: string; fecha_incidente: string;
  motivo: string; descripcion: string; estado: string; respuesta?: string;
  created_at: string; updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class ExperienciaService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/experiencia`;

  getCalificaciones(): Observable<CalificacionServicio[]> {
    return this.http.get<CalificacionServicio[]>(`${this.url}/calificaciones`);
  }

  calificar(payload: { orden_venta_id: number; puntuacion: number; comentario?: string }): Observable<CalificacionServicio> {
    return this.http.post<CalificacionServicio>(`${this.url}/calificaciones`, payload);
  }

  getReclamos(estado?: string): Observable<Reclamo[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<Reclamo[]>(`${this.url}/reclamos`, { params });
  }

  crearReclamo(payload: {
    sucursal_id: number; fecha_incidente: string; motivo: string; descripcion: string;
    orden_venta_id?: number; calificacion_id?: number;
  }): Observable<Reclamo> {
    return this.http.post<Reclamo>(`${this.url}/reclamos`, payload);
  }

  actualizarReclamo(id: number, estado: string, respuesta?: string): Observable<Reclamo> {
    return this.http.patch<Reclamo>(`${this.url}/reclamos/${id}`, { estado, respuesta });
  }
}

