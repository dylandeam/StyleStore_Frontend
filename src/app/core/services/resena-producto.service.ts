import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, from, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OfflineOperationsService, OfflineQueuedResult } from './offline-operations.service';

export interface ResenaProductoItem {
  id: number;
  puntuacion: number;
  comentario: string;
  autor_nombre: string;
  autor_foto?: string | null;
  compra_verificada: boolean;
  es_propia: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResenasProductoResponse {
  producto_codigo: string;
  resumen: {
    promedio: number;
    total: number;
    compras_verificadas: number;
    distribucion: Record<number, number>;
  };
  resenas: ResenaProductoItem[];
  mi_resena?: ResenaProductoItem | null;
  puede_comentar: boolean;
}

@Injectable({ providedIn: 'root' })
export class ResenaProductoService {
  private http = inject(HttpClient);
  private offlineOperations = inject(OfflineOperationsService);
  private apiUrl = `${environment.apiUrl}/productos`;

  getByProduct(codigo: string): Observable<ResenasProductoResponse> {
    return this.http.get<ResenasProductoResponse>(`${this.apiUrl}/${encodeURIComponent(codigo)}/resenas`);
  }

  saveMine(codigo: string, puntuacion: number, comentario: string): Observable<ResenasProductoResponse | OfflineQueuedResult> {
    const payload = { codigo, puntuacion, comentario };
    return defer(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return from(this.offlineOperations.queueProductReview(payload));
      }
      return this.http.put<ResenasProductoResponse>(
        `${this.apiUrl}/${encodeURIComponent(codigo)}/resenas/mia`,
        { puntuacion, comentario },
      ).pipe(catchError((error) => {
        if (error?.status === 0) {
          return from(this.offlineOperations.queueProductReview(payload));
        }
        return throwError(() => error);
      }));
    });
  }

  deleteMine(codigo: string): Observable<ResenasProductoResponse> {
    return this.http.delete<ResenasProductoResponse>(`${this.apiUrl}/${encodeURIComponent(codigo)}/resenas/mia`);
  }
}

