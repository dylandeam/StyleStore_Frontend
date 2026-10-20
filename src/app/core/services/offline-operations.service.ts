import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { OfflineDbService, OfflineOperation } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';

export interface OfflineQueuedResult {
  queued: true;
  operationId: string;
  status: 'pendiente';
  message: string;
  clientCreatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineOperationsService {
  private readonly db = inject(OfflineDbService);
  private readonly auth = inject(AuthService);
  private readonly state = inject(OfflineStateService);

  async queueReservation<T extends { sucursal_id: number }>(payload: T): Promise<OfflineQueuedResult> {
    return this.queue('reserva', payload, payload.sucursal_id);
  }

  async queueCashSale<T extends { sucursal_id: number; metodo_pago?: string }>(payload: T): Promise<OfflineQueuedResult> {
    if ((payload.metodo_pago || 'efectivo').toLowerCase() !== 'efectivo') {
      throw new Error('Sin conexión solo se permiten ventas de contado en efectivo. QR y pagos electrónicos requieren red.');
    }
    return this.queue('venta_efectivo', payload, payload.sucursal_id);
  }

  async listCurrent(): Promise<OfflineOperation[]> {
    const scope = this.currentIdentity().scope;
    const records = await this.db.list(scope);
    this.state.pendingOperations.set(records.filter((item) => item.status === 'pendiente' || item.status === 'conflicto').length);
    return records;
  }

  async refreshPendingCount(): Promise<void> {
    await this.listCurrent();
  }

  private async queue<T>(type: 'reserva' | 'venta_efectivo', payload: T, sucursalId: number): Promise<OfflineQueuedResult> {
    const identity = this.currentIdentity();
    const operation = await this.db.enqueue({
      scope: identity.scope,
      empresaId: identity.empresaId,
      usuarioId: identity.usuarioId,
      sucursalId,
      type,
      payloadVersion: 1,
      payload,
    });
    await this.refreshPendingCount();
    return {
      queued: true,
      operationId: operation.id,
      status: 'pendiente',
      message: 'Operación guardada en este dispositivo. Queda pendiente de validación central.',
      clientCreatedAt: operation.clientCreatedAt,
    };
  }

  private currentIdentity(): { scope: string; empresaId: number | null; usuarioId: number } {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Debes iniciar sesión antes de guardar operaciones sin conexión.');
    return {
      scope: `empresa-${user.empresa_id ?? 'plataforma'}:usuario-${user.id}`,
      empresaId: user.empresa_id ?? null,
      usuarioId: user.id,
    };
  }
}
