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
    let trimmed = url.trim();

    const baseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

    // 1. Si la URL guardada apuntaba a localhost (subida desde PC), reemplazarla por la URL pública del backend
    if (trimmed.includes('localhost:8000') || trimmed.includes('127.0.0.1:8000')) {
      trimmed = trimmed
        .replace('http://localhost:8000', baseUrl)
        .replace('http://127.0.0.1:8000', baseUrl)
        .replace('https://localhost:8000', baseUrl)
        .replace('https://127.0.0.1:8000', baseUrl);
    }

    // 2. Si la URL es HTTP hacia Railway, forzar HTTPS para evitar que Safari en iPhone la bloquee por Mixed Content
    if (trimmed.startsWith('http://stylestorebackend-production.up.railway.app')) {
      trimmed = trimmed.replace('http://', 'https://');
    }

    // 3. Si ya es data URI o URL absoluta HTTPS
    if (trimmed.startsWith('data:') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // 4. Si es HTTP genérico en sitio HTTPS (Vercel), actualizar a HTTPS
    if (trimmed.startsWith('http://')) {
      if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') {
        return trimmed.replace('http://', 'https://');
      }
      return trimmed;
    }

    // 5. Si es una ruta relativa (/uploads/...)
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
