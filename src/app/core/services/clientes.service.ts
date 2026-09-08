import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, ClienteCreate, ClienteUpdate } from '../models/cliente.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clientes`;

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  getCliente(codigo: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${codigo}`);
  }

  createCliente(data: ClienteCreate): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, data);
  }

  updateCliente(codigo: string, data: ClienteUpdate): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${codigo}`, data);
  }

  deleteCliente(codigo: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${codigo}`);
  }
}
