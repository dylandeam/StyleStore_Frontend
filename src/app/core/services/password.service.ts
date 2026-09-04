import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class PasswordService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/password`;

  requestChange(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/request-change`, {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    });
  }

  confirmChange(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/confirm`, {
      token,
    });
  }
}
