import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proximamente, ProximamenteCreate, ProximamenteUpdate } from '../models/proximamente.model';

@Injectable({
  providedIn: 'root',
})
export class ProximamenteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proximamente`;

  getProximamente(): Observable<Proximamente[]> {
    return this.http.get<Proximamente[]>(this.apiUrl);
  }

  getProximamenteItem(id: number): Observable<Proximamente> {
    return this.http.get<Proximamente>(`${this.apiUrl}/${id}`);
  }

  createProximamente(data: ProximamenteCreate): Observable<Proximamente> {
    return this.http.post<Proximamente>(this.apiUrl, data);
  }

  updateProximamente(id: number, data: ProximamenteUpdate): Observable<Proximamente> {
    return this.http.put<Proximamente>(`${this.apiUrl}/${id}`, data);
  }

  deleteProximamente(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  notificarLlegada(id: number): Observable<{ message: string; total_notificados: number; item: Proximamente }> {
    return this.http.post<{ message: string; total_notificados: number; item: Proximamente }>(
      `${this.apiUrl}/${id}/notificar`,
      {}
    );
  }
}
