import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria, CategoriaCreate } from '../models/categoria.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/categorias`;

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  getCategoria(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  createCategoria(data: CategoriaCreate): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, data);
  }

  updateCategoria(id: number, data: CategoriaCreate): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, data);
  }

  deleteCategoria(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
