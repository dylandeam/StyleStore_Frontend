import { HttpInterceptorFn } from '@angular/common/http';

import { PlatformTenantContextService } from '../services/platform-tenant-context.service';

export const tenantContextInterceptor: HttpInterceptorFn = (req, next) => {
  let tenantId: number | null = null;
  try {
    const raw = localStorage.getItem(PlatformTenantContextService.storageKey);
    tenantId = raw ? Number(JSON.parse(raw)?.id) : null;
  } catch {
    tenantId = null;
  }

  if (!tenantId || !req.url.includes('/api/')) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant-Context': String(tenantId) } }));
};
