import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Coleccion, ColeccionCreate, ColeccionUpdate } from '../models/coleccion.model';

@Injectable({
  providedIn: 'root',
})
export class ColeccionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/colecciones`;

  getColecciones(): Observable<Coleccion[]> {
    return this.http.get<Coleccion[]>(this.apiUrl);
  }

  getColeccion(id: number): Observable<Coleccion> {
    return this.http.get<Coleccion>(`${this.apiUrl}/${id}`);
  }

  createColeccion(data: ColeccionCreate): Observable<Coleccion> {
    return this.http.post<Coleccion>(this.apiUrl, data);
  }

  updateColeccion(id: number, data: ColeccionUpdate): Observable<Coleccion> {
    return this.http.put<Coleccion>(`${this.apiUrl}/${id}`, data);
  }

  deleteColeccion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
