import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { OfflineStateService } from './offline-state.service';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly state = inject(OfflineStateService);

  initialize(): void {
    if (!this.updates?.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.state.updateAvailable.set(true));
  }

  async activate(): Promise<void> {
    if (!this.updates?.isEnabled) return;
    await this.updates.activateUpdate();
    document.location.reload();
  }
}
