import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proveedor, ProveedorCreate, ProveedorUpdate } from '../models/proveedor.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proveedores`;

  getProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.apiUrl);
  }

  getProveedor(codigo: string): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.apiUrl}/${codigo}`);
  }

  createProveedor(data: ProveedorCreate): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, data);
  }

  updateProveedor(codigo: string, data: ProveedorUpdate): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}/${codigo}`, data);
  }

  deleteProveedor(codigo: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${codigo}`);
  }
}
