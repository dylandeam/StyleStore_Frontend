import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { InventarioService } from './inventario.service';
import { OfflineDbService } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';

describe('InventarioService offline POS', () => {
  it('recovers the branch inventory snapshot after a network failure', async () => {
    const inventory = [{
      id: 41,
      stock_inventario_id: 41,
      producto_nombre: 'Polo',
      cantidad: 5,
      cantidad_disponible: 5,
      precio: 69.99,
      precio_unitario: 69.99,
    }];
    const offlineDb = {
      getCatalog: vi.fn().mockResolvedValue({
        key: 'empresa-3:usuario-9:pos-inventario:sucursal-7',
        scope: 'empresa-3:usuario-9',
        filterKey: 'pos-inventario:sucursal-7',
        data: inventory,
        syncedAt: '2026-10-28T12:30:00Z',
      }),
      putCatalog: vi.fn(),
    };
    await TestBed.configureTestingModule({
      providers: [
        InventarioService,
        { provide: HttpClient, useValue: { get: () => throwError(() => new Error('offline')) } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 9, empresa_id: 3 }) } },
        { provide: OfflineDbService, useValue: offlineDb },
        OfflineStateService,
      ],
    }).compileComponents();

    const result = await firstValueFrom(TestBed.inject(InventarioService).getInventarioSucursal(7));

    expect(result).toEqual(inventory as any);
    expect(offlineDb.getCatalog).toHaveBeenCalledWith(
      'empresa-3:usuario-9',
      'pos-inventario:sucursal-7'
    );
    expect(TestBed.inject(OfflineStateService).usingCachedCatalog()).toBe(true);
  });
});
