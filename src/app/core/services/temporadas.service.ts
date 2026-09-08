import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Temporada, TemporadaCreate } from '../models/temporada.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class TemporadasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/temporadas`;

  getTemporadas(): Observable<Temporada[]> {
    return this.http.get<Temporada[]>(this.apiUrl);
  }

  getTemporada(id: number): Observable<Temporada> {
    return this.http.get<Temporada>(`${this.apiUrl}/${id}`);
  }

  createTemporada(data: TemporadaCreate): Observable<Temporada> {
    return this.http.post<Temporada>(this.apiUrl, data);
  }

  updateTemporada(id: number, data: TemporadaCreate): Observable<Temporada> {
    return this.http.put<Temporada>(`${this.apiUrl}/${id}`, data);
  }

  deleteTemporada(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
