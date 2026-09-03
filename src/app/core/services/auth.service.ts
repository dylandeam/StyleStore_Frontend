import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { User } from '../models/user.model';
import { LoginRequest, RegisterRequest, TokenResponse, MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  private readonly API_URL = environment.apiUrl;

  // Reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(this.tokenService.hasToken());
  isLoading = signal<boolean>(false);

  register(payload: RegisterRequest): Observable<User> {
    this.isLoading.set(true);
    return this.http.post<User>(`${this.API_URL}/auth/register`, payload).pipe(
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  login(payload: LoginRequest): Observable<TokenResponse> {
    this.isLoading.set(true);
    return this.http.post<TokenResponse>(`${this.API_URL}/auth/login`, payload).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.access_token, res.refresh_token);
        this.isAuthenticated.set(true);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/me`).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError((error) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const token = this.tokenService.getAccessToken();
    if (token) {
      this.http.post<MessageResponse>(`${this.API_URL}/auth/logout`, {}).subscribe({
        error: () => {}, // Ignore errors on logout
      });
    }

    this.tokenService.clearTokens();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }
}
