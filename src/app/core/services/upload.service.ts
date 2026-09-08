import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/uploads`;

  uploadImage(file: File, folder: 'productos' | 'empleados' = 'productos'): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.apiUrl}?folder=${folder}`, formData);
  }

  getImageUrl(url?: string | null, folder: 'productos' | 'empleados' = 'productos'): string {
    if (!url || !url.trim()) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const baseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    let path = trimmed;
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    if (!path.startsWith('/uploads/')) {
      path = `/uploads/${folder}${path}`;
    }
    return `${baseUrl}${path}`;
  }
}
