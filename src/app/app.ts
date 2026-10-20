import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OfflineStateService } from './core/services/offline-state.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { OfflineOperationsService } from './core/services/offline-operations.service';

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

  constructor() {
    this.pwaUpdates.initialize();
    void this.offlineOperations.refreshPendingCount().catch(() => undefined);
  }

  applyUpdate(): void {
    void this.pwaUpdates.activate();
  }

  formatSyncDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '';
  }
}
