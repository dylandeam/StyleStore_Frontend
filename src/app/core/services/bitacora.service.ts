import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BitacoraPageResponse } from '../models/bitacora.model';

@Injectable({
  providedIn: 'root',
})
export class BitacoraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bitacora`;

  getLogs(filters: {
    user?: string;
    from?: string;
    to?: string;
    module?: string;
    page?: number;
    size?: number;
  }): Observable<BitacoraPageResponse> {
    let params = new HttpParams();
    if (filters.user) params = params.set('user', filters.user);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.module) params = params.set('module', filters.module);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.size) params = params.set('size', filters.size.toString());

    return this.http.get<BitacoraPageResponse>(this.apiUrl, { params });
  }
}
