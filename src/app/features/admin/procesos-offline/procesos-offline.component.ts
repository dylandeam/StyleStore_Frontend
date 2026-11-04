import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { SucursalService } from '../../../core/services/sucursal.service';
import {
  SyncAdminOperation,
  SyncAdminService,
  SyncMetrics,
  SyncOperationStatus,
  SyncOperationType,
} from '../../../core/services/sync-admin.service';

@Component({
  selector: 'app-procesos-offline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './procesos-offline.component.html',
  styleUrl: './procesos-offline.component.css',
})
export class ProcesosOfflineComponent implements OnInit {
  readonly Math = Math;
  private readonly syncAdmin = inject(SyncAdminService);
  private readonly sucursalService = inject(SucursalService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly operations = signal<SyncAdminOperation[]>([]);
  readonly metrics = signal<SyncMetrics | null>(null);
  readonly selected = signal<SyncAdminOperation | null>(null);
  readonly branches = signal<Sucursal[]>([]);
  readonly total = signal(0);

  status = '';
  operationType = '';
  sucursalId: number | null = null;
  offset = 0;
  readonly limit = 50;
  private focusUuid: string | null = null;

  ngOnInit(): void {
    this.focusUuid = this.route.snapshot.queryParamMap.get('operation_uuid');
    this.sucursalService.getSucursales(true).subscribe({
      next: (items) => this.branches.set(items || []),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  load(resetOffset = false): void {
    if (resetOffset) this.offset = 0;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      operations: this.syncAdmin.list({
        status: this.status,
        operationType: this.operationType,
        sucursalId: this.sucursalId,
        limit: this.limit,
        offset: this.offset,
      }),
      metrics: this.syncAdmin.metrics(this.sucursalId),
    }).subscribe({
      next: ({ operations, metrics }) => {
        this.operations.set(operations.items);
        this.total.set(operations.total);
        this.metrics.set(metrics);
        this.loading.set(false);
        if (this.focusUuid) {
          const target = operations.items.find((item) => item.operation_uuid === this.focusUuid);
          if (target) this.selected.set(target);
          this.focusUuid = null;
        }
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'No pudimos cargar el historial offline. Reintenta en unos segundos.');
        this.loading.set(false);
      },
    });
  }

  toggleDetail(item: SyncAdminOperation): void {
    this.selected.set(this.selected()?.operation_uuid === item.operation_uuid ? null : item);
  }

  previous(): void {
    if (this.offset === 0) return;
    this.offset = Math.max(0, this.offset - this.limit);
    this.load();
  }

  next(): void {
    if (this.offset + this.limit >= this.total()) return;
    this.offset += this.limit;
    this.load();
  }

  operationLabel(type: SyncOperationType): string {
    return ({ reserva: 'Reserva', venta_efectivo: 'Venta en efectivo', resena_producto: 'Reseña' })[type];
  }

  statusLabel(status: SyncOperationStatus): string {
    return ({ procesando: 'Procesando', confirmada: 'Confirmada', rechazada: 'Rechazada', conflicto: 'Conflicto' })[status];
  }

  resultLabel(item: SyncAdminOperation): string {
    if (item.refund_id) return `Reembolso #${item.refund_id}`;
    if (item.result_id) return `${item.result_type || 'Registro'} #${item.result_id}`;
    return 'Sin resultado asociado';
  }

  shortUuid(uuid: string): string {
    return uuid.slice(0, 8).toUpperCase();
  }
}
