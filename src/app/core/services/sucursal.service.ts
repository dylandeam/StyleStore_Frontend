import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sucursal, SucursalCreate } from '../models/sucursal.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class SucursalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sucursales`;

  getSucursales(activeOnly: boolean = false): Observable<Sucursal[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('active_only', 'true');
    }
    return this.http.get<Sucursal[]>(this.apiUrl, { params });
  }

  getSucursal(id: number): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${this.apiUrl}/${id}`);
  }

  createSucursal(data: SucursalCreate): Observable<Sucursal> {
    return this.http.post<Sucursal>(this.apiUrl, data);
  }

  updateSucursal(id: number, data: Partial<SucursalCreate>): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.apiUrl}/${id}`, data);
  }

  deleteSucursal(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
