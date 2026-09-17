import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackupItem {
  id: number;
  nombre_archivo: string;
  sha256_hash: string;
  tamano_bytes: number;
  tipo: string;
  estado: string;
  creado_por: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackupsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/backups`;

  generarBackup(): Observable<any> {
    return this.http.post(`${this.apiUrl}/generar`, {});
  }

  listarBackups(): Observable<BackupItem[]> {
    return this.http.get<BackupItem[]>(this.apiUrl);
  }

  descargarBackup(backupId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${backupId}/descargar`, {
      responseType: 'blob',
    });
  }

  verificarIntegridad(id: number, expectedHash: string): Observable<{ id: number; es_valido: boolean; mensaje: string }> {
    return this.http.post<{ id: number; es_valido: boolean; mensaje: string }>(`${this.apiUrl}/verificar`, {
      id,
      expected_hash: expectedHash,
    });
  }
}
