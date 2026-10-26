import { Injectable, signal } from '@angular/core';

export interface PlatformTenantContext {
  id: number;
  codigo: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformTenantContextService {
  static readonly storageKey = 'stylestore_platform_tenant_context';

  readonly selected = signal<PlatformTenantContext | null>(this.read());

  select(tenant: PlatformTenantContext | null): void {
    this.selected.set(tenant);
    if (tenant) {
      localStorage.setItem(PlatformTenantContextService.storageKey, JSON.stringify(tenant));
    } else {
      localStorage.removeItem(PlatformTenantContextService.storageKey);
    }
    localStorage.removeItem('stylestore_selected_branch');
  }

  clear(): void {
    this.select(null);
  }

  private read(): PlatformTenantContext | null {
    try {
      const raw = localStorage.getItem(PlatformTenantContextService.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Number(parsed?.id) > 0 && parsed?.codigo && parsed?.nombre ? parsed : null;
    } catch {
      return null;
    }
  }
}
