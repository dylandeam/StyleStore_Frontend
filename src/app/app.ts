import { Component, inject, signal } from '@angular/core';
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
export class App {
  readonly offlineState = inject(OfflineStateService);
  private readonly pwaUpdates = inject(PwaUpdateService);
  private readonly offlineOperations = inject(OfflineOperationsService);
  readonly pwaInstall = inject(PwaInstallService);
  readonly showInstallPrompt = signal(true);

  constructor() {
    this.pwaUpdates.initialize();
    void this.offlineOperations.refreshPendingCount().catch(() => undefined);
    if (this.offlineState.online()) void this.offlineOperations.syncPending().catch(() => undefined);
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

  formatSyncDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '';
  }
}
