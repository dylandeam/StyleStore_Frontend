import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OutfitCreate,
  OutfitResponse,
  BuyOutfitResult,
} from '../models/outfit.model';

@Injectable({
  providedIn: 'root',
})
export class OutfitService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/outfits`;

  getMyOutfits(): Observable<OutfitResponse[]> {
    return this.http.get<OutfitResponse[]>(this.apiUrl);
  }

  createOutfit(payload: OutfitCreate): Observable<OutfitResponse> {
    return this.http.post<OutfitResponse>(this.apiUrl, payload);
  }

  deleteOutfit(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  buyOutfit(id: number): Observable<BuyOutfitResult> {
    return this.http.post<BuyOutfitResult>(`${this.apiUrl}/${id}/comprar`, {});
  }
}
