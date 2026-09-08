import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Color, ColorCreate } from '../models/color.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ColoresService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/colores`;

  getColores(): Observable<Color[]> {
    return this.http.get<Color[]>(this.apiUrl);
  }

  getColor(id: number): Observable<Color> {
    return this.http.get<Color>(`${this.apiUrl}/${id}`);
  }

  createColor(data: ColorCreate): Observable<Color> {
    return this.http.post<Color>(this.apiUrl, data);
  }

  updateColor(id: number, data: ColorCreate): Observable<Color> {
    return this.http.put<Color>(`${this.apiUrl}/${id}`, data);
  }

  deleteColor(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
