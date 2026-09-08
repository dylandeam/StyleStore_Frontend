import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockInventarioItem, StockBulkUpdateRequest } from '../models/stock.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/productos`;

  getProductStock(codigo: string): Observable<StockInventarioItem[]> {
    return this.http.get<StockInventarioItem[]>(`${this.apiUrl}/${codigo}/stock`);
  }

  updateProductStock(codigo: string, data: StockBulkUpdateRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/${codigo}/stock`, data);
  }
}
