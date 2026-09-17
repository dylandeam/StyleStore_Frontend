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

export interface BackupConfig {
  id: number;
  auto_backup_enabled: boolean;
  frequency_hours: number;
  retention_days: number;
  last_auto_backup: string | null;
  updated_at: string | null;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  total_records_restored?: number;
  tables_count?: number;
  sha256?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackupsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/backups`;

  generarBackup(): Observable<BackupItem> {
    return this.http.post<BackupItem>(`${this.apiUrl}/generar`, {});
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

  getConfig(): Observable<BackupConfig> {
    return this.http.get<BackupConfig>(`${this.apiUrl}/config`);
  }

  updateConfig(payload: { auto_backup_enabled: boolean; frequency_hours: number; retention_days: number }): Observable<BackupConfig> {
    return this.http.put<BackupConfig>(`${this.apiUrl}/config`, payload);
  }

  restaurarDesdeServidor(backupId: number): Observable<RestoreResponse> {
    return this.http.post<RestoreResponse>(`${this.apiUrl}/${backupId}/restaurar`, {});
  }

  subirYRestaurar(file: File): Observable<RestoreResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<RestoreResponse>(`${this.apiUrl}/subir-restaurar`, formData);
  }

  eliminarBackup(backupId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${backupId}`);
  }
}

