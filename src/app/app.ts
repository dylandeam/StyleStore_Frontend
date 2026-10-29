import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OfflineStateService } from './core/services/offline-state.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { OfflineOperationsService } from './core/services/offline-operations.service';
import { PwaInstallService } from './core/services/pwa-install.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  readonly offlineState = inject(OfflineStateService);
  private readonly pwaUpdates = inject(PwaUpdateService);
  private readonly offlineOperations = inject(OfflineOperationsService);
  readonly pwaInstall = inject(PwaInstallService);
  readonly showInstallPrompt = signal(true);
  readonly syncNotice = signal<{ title: string; body: string } | null>(null);
  private syncNoticeTimer?: ReturnType<typeof setTimeout>;
  private readonly syncNoticeHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ title: string; body: string }>).detail;
    if (!detail?.title) return;
    this.syncNotice.set(detail);
    clearTimeout(this.syncNoticeTimer);
    this.syncNoticeTimer = setTimeout(() => this.syncNotice.set(null), 7000);
  };

  constructor() {
    this.pwaUpdates.initialize();
    void this.offlineOperations.refreshPendingCount().catch(() => undefined);
    if (this.offlineState.online()) void this.offlineOperations.syncPending().catch(() => undefined);
    if (typeof window !== 'undefined') {
      window.addEventListener('stylestore:offline-operation-result', this.syncNoticeHandler);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.syncNoticeTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('stylestore:offline-operation-result', this.syncNoticeHandler);
    }
  }

  applyUpdate(): void {
    void this.pwaUpdates.activate();
  }

  installApp(): void {
    void this.pwaInstall.install();
  }

  dismissInstallPrompt(): void {
    this.showInstallPrompt.set(false);
  }

  dismissSyncNotice(): void {
    this.syncNotice.set(null);
    clearTimeout(this.syncNoticeTimer);
  }

  formatSyncDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '';
  }
}
