import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Talla, TallaCreate } from '../models/talla.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class TallasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tallas`;

  getTallas(): Observable<Talla[]> {
    return this.http.get<Talla[]>(this.apiUrl);
  }

  getTalla(id: number): Observable<Talla> {
    return this.http.get<Talla>(`${this.apiUrl}/${id}`);
  }

  createTalla(data: TallaCreate): Observable<Talla> {
    return this.http.post<Talla>(this.apiUrl, data);
  }

  updateTalla(id: number, data: TallaCreate): Observable<Talla> {
    return this.http.put<Talla>(`${this.apiUrl}/${id}`, data);
  }

  deleteTalla(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
