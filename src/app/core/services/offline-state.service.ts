import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineStateService {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly usingCachedCatalog = signal(false);
  readonly lastCatalogSync = signal<string | null>(null);
  readonly updateAvailable = signal(false);
  readonly pendingOperations = signal(0);
  readonly showStatus = computed(
    () => !this.online() || this.usingCachedCatalog() || this.updateAvailable() || this.pendingOperations() > 0
  );

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
  }
}
