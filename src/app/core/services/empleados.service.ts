import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from '../models/empleado.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class EmpleadosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/empleados`;

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(this.apiUrl);
  }

  getEmpleado(codigo: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/${codigo}`);
  }

  createEmpleado(data: EmpleadoCreate): Observable<Empleado> {
    return this.http.post<Empleado>(this.apiUrl, data);
  }

  updateEmpleado(codigo: string, data: EmpleadoUpdate): Observable<Empleado> {
    return this.http.put<Empleado>(`${this.apiUrl}/${codigo}`, data);
  }

  deleteEmpleado(codigo: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${codigo}`);
  }
}
