import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { TokenService } from '../services/token.service';

function normalizeDetail(detail: unknown): string | unknown {
  if (typeof detail === 'string') {
    const normalized = detail.toLowerCase();
    const isDuplicate = normalized.includes('duplicate key') || normalized.includes('unique constraint');
    const isTechnical = [
      'database error',
      'sqlalchemy',
      'psycopg',
      'integrityerror',
      'traceback',
      'violates foreign key',
    ].some((marker) => normalized.includes(marker));
    if (isDuplicate) {
      return 'Ya existe un registro con esos datos.';
    }
    if (isTechnical) {
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const message = record['msg'] ?? record['message'] ?? record['detail'];
          const location = Array.isArray(record['loc']) ? record['loc'].slice(1).join('.') : '';
          return message ? `${location ? `${location}: ` : ''}${String(message)}` : '';
        }
        return '';
      })
      .filter(Boolean);
    return messages.length ? messages.join(' · ') : 'La solicitud contiene datos inválidos.';
  }
  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    return String(record['message'] ?? record['msg'] ?? 'No se pudo procesar la solicitud.');
  }
  return detail;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const token = tokenService.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        tokenService.clearTokens();
        localStorage.removeItem('stylestore_platform_tenant_context');
        const tenant = localStorage.getItem('stylestore_login_tenant');
        router.navigate(['/auth/login'], {
          queryParams: { sessionExpired: true, tenant: tenant || undefined },
        });
      }
      const payload = error.error;
      if (payload && typeof payload === 'object' && 'detail' in payload) {
        const normalizedError = new HttpErrorResponse({
          error: { ...payload, detail: normalizeDetail(payload.detail) },
          headers: error.headers,
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
        return throwError(() => normalizedError);
      }
      return throwError(() => error);
    })
  );
};


