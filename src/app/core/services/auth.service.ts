import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { User, UserCreateByAdmin } from '../models/user.model';
import { LoginRequest, RegisterRequest, RegistrationCompany, TenantAccess, TenantBranding, TokenResponse, MessageResponse } from '../models/auth.model';
import { PlatformTenantContextService } from './platform-tenant-context.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private platformTenantContext = inject(PlatformTenantContextService);

  private readonly API_URL = environment.apiUrl;

  private getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('stylestore_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  private saveStoredUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem('stylestore_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('stylestore_user');
      }
    } catch {}
  }

  // Reactive state
  currentUser = signal<User | null>(this.getStoredUser());
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

  getRegistrationCompanies(): Observable<RegistrationCompany[]> {
    return this.http.get<RegistrationCompany[]>(`${this.API_URL}/empresas/publicas/registro`);
  }

  getTenantPortal(code: string): Observable<TenantBranding> {
    return this.http.get<TenantBranding>(`${this.API_URL}/empresas/publicas/${encodeURIComponent(code)}/portal`);
  }

  registerForTenant(code: string, payload: RegisterRequest): Observable<User> {
    this.isLoading.set(true);
    return this.http.post<User>(`${this.API_URL}/auth/register/tenant/${encodeURIComponent(code)}`, payload).pipe(
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  getMyTenants(): Observable<TenantAccess[]> {
    return this.http.get<TenantAccess[]>(`${this.API_URL}/auth/tenants`);
  }

  selectTenant(empresaId: number): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API_URL}/auth/tenants/select`, { empresa_id: empresaId }).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.access_token, res.refresh_token);
        localStorage.removeItem('stylestore_selected_branch');
        localStorage.removeItem('stylestore_pending_order_id');
        this.currentUser.set(null);
        this.saveStoredUser(null);
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
      tap((user) => {
        this.currentUser.set(user);
        this.saveStoredUser(user);
      }),
      catchError((error) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  getUsers(search?: string, role?: string): Observable<User[]> {
    let params: any = {};
    if (search) params.search = search;
    if (role) params.role = role;
    return this.http.get<User[]>(`${this.API_URL}/users`, { params });
  }

  createEmployee(payload: UserCreateByAdmin): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/users`, payload);
  }

  updateProfile(data: {
    name?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    foto?: string;
  }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/users/me`, data).pipe(
      tap((updatedUser) => {
        this.currentUser.set(updatedUser);
        this.saveStoredUser(updatedUser);
      })
    );
  }

  updateUserByAdmin(userId: number, data: any): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/users/${userId}`, data);
  }

  logout(): void {
    const token = this.tokenService.getAccessToken();
    if (token) {
      this.http.post<MessageResponse>(`${this.API_URL}/auth/logout`, {}).subscribe({
        error: () => {}, // Ignore errors on logout
      });
    }

    this.tokenService.clearTokens();
    this.saveStoredUser(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.platformTenantContext.clear();
    this.router.navigate(['/auth/tenant']);
  }
}
