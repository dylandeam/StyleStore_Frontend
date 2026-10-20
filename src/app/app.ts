import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineStateService } from './core/services/offline-state.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly offlineState = inject(OfflineStateService);
  private readonly pwaUpdates = inject(PwaUpdateService);

  constructor() {
    this.pwaUpdates.initialize();
  }

  applyUpdate(): void {
    void this.pwaUpdates.activate();
  }

  formatSyncDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '';
  }
}
