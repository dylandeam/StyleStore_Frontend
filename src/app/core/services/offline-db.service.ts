import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

export type OfflineOperationType = 'reserva' | 'venta_efectivo';
export type OfflineOperationStatus = 'pendiente' | 'sincronizando' | 'confirmada' | 'rechazada' | 'conflicto';

export interface CatalogSnapshot<T = unknown> {
  key: string;
  scope: string;
  filterKey: string;
  data: T;
  syncedAt: string;
}

export interface OfflineOperation<T = unknown> {
  id: string;
  scope: string;
  empresaId: number | null;
  usuarioId: number;
  sucursalId: number | null;
  type: OfflineOperationType;
  payloadVersion: 1;
  payload: T;
  clientCreatedAt: string;
  status: OfflineOperationStatus;
  reason?: string;
}

interface StyleStoreOfflineSchema extends DBSchema {
  catalog: {
    key: string;
    value: CatalogSnapshot;
    indexes: { scope: string };
  };
  operations: {
    key: string;
    value: OfflineOperation;
    indexes: { scope: string; status: OfflineOperationStatus; type: OfflineOperationType };
  };
}

@Injectable({ providedIn: 'root' })
export class OfflineDbService {
  private databasePromise?: Promise<IDBPDatabase<StyleStoreOfflineSchema>>;

  private database(): Promise<IDBPDatabase<StyleStoreOfflineSchema>> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
    }
    this.databasePromise ??= openDB<StyleStoreOfflineSchema>('stylestore-offline', 1, {
      upgrade(db) {
        const catalog = db.createObjectStore('catalog', { keyPath: 'key' });
        catalog.createIndex('scope', 'scope');
        const operations = db.createObjectStore('operations', { keyPath: 'id' });
        operations.createIndex('scope', 'scope');
        operations.createIndex('status', 'status');
        operations.createIndex('type', 'type');
      },
    });
    return this.databasePromise;
  }

  async putCatalog<T>(scope: string, filterKey: string, data: T): Promise<CatalogSnapshot<T>> {
    const snapshot: CatalogSnapshot<T> = {
      key: `${scope}:${filterKey}`,
      scope,
      filterKey,
      data,
      syncedAt: new Date().toISOString(),
    };
    await (await this.database()).put('catalog', snapshot as CatalogSnapshot);
    return snapshot;
  }

  async getCatalog<T>(scope: string, filterKey: string): Promise<CatalogSnapshot<T> | undefined> {
    return (await this.database()).get('catalog', `${scope}:${filterKey}`) as Promise<CatalogSnapshot<T> | undefined>;
  }

  async enqueue<T>(operation: Omit<OfflineOperation<T>, 'id' | 'clientCreatedAt' | 'status'>): Promise<OfflineOperation<T>> {
    const queued: OfflineOperation<T> = {
      ...operation,
      id: crypto.randomUUID(),
      clientCreatedAt: new Date().toISOString(),
      status: 'pendiente',
    };
    await (await this.database()).put('operations', queued as OfflineOperation);
    return queued;
  }

  async pending(scope: string): Promise<OfflineOperation[]> {
    const records = await (await this.database()).getAllFromIndex('operations', 'scope', scope);
    return records.filter((record) => record.status === 'pendiente');
  }

  async list(scope: string): Promise<OfflineOperation[]> {
    const records = await (await this.database()).getAllFromIndex('operations', 'scope', scope);
    return records.sort((left, right) => right.clientCreatedAt.localeCompare(left.clientCreatedAt));
  }

  async updateOperation(id: string, changes: Partial<OfflineOperation>): Promise<void> {
    const db = await this.database();
    const current = await db.get('operations', id);
    if (current) await db.put('operations', { ...current, ...changes });
  }
}
