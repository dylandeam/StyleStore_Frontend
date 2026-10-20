import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { OfflineOperation } from '../../core/services/offline-db.service';
import { OfflineOperationsService } from '../../core/services/offline-operations.service';

@Component({
  selector: 'app-offline-operations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-operations.component.html',
  styleUrl: './offline-operations.component.css',
})
export class OfflineOperationsComponent implements OnInit {
  private readonly offlineOperations = inject(OfflineOperationsService);
  readonly operations = signal<OfflineOperation[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly syncing = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.operations.set(await this.offlineOperations.listCurrent());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo abrir la cola local.');
    } finally {
      this.loading.set(false);
    }
  }

  async synchronize(): Promise<void> {
    this.syncing.set(true);
    try {
      await this.offlineOperations.syncPending();
      await this.load();
    } finally {
      this.syncing.set(false);
    }
  }

  title(operation: OfflineOperation): string {
    return operation.type === 'reserva' ? 'Reserva de prenda' : 'Venta de contado';
  }

  branch(operation: OfflineOperation): string {
    return operation.sucursalId ? `Sucursal #${operation.sucursalId}` : 'Sucursal no indicada';
  }
}
