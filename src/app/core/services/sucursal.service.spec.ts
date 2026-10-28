import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { OfflineDbService } from './offline-db.service';
import { OfflineStateService } from './offline-state.service';
import { SucursalService } from './sucursal.service';

describe('SucursalService offline', () => {
  const branch = {
    id: 7,
    name: 'Sucursal Centro',
    city: 'Santa Cruz',
    address: 'Centro',
    phone: '70000000',
    active: true,
    created_at: '2026-10-28T12:00:00Z',
    updated_at: '2026-10-28T12:00:00Z',
  };

  it('returns the tenant-scoped branch snapshot when the network fails', async () => {
    const http = { get: () => throwError(() => new Error('offline')) };
    const offlineDb = {
      getCatalog: vi.fn().mockResolvedValue({
        key: 'empresa-3:usuario-9:sucursales:todas',
        scope: 'empresa-3:usuario-9',
        filterKey: 'sucursales:todas',
        data: [branch],
        syncedAt: '2026-10-28T12:00:00Z',
      }),
      putCatalog: vi.fn(),
    };
    await TestBed.configureTestingModule({
      providers: [
        SucursalService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 9, empresa_id: 3 }) } },
        { provide: OfflineDbService, useValue: offlineDb },
        OfflineStateService,
      ],
    }).compileComponents();

    const service = TestBed.inject(SucursalService);
    const result = await firstValueFrom(service.getSucursales());

    expect(result).toEqual([branch]);
    expect(offlineDb.getCatalog).toHaveBeenCalledWith('empresa-3:usuario-9', 'sucursales:todas');
    expect(TestBed.inject(OfflineStateService).usingCachedCatalog()).toBe(true);
  });

  it('stores the successful branch response for the next offline session', async () => {
    const http = { get: () => of([branch]) };
    const offlineDb = {
      getCatalog: vi.fn(),
      putCatalog: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        SucursalService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 9, empresa_id: 3 }) } },
        { provide: OfflineDbService, useValue: offlineDb },
        OfflineStateService,
      ],
    }).compileComponents();

    const result = await firstValueFrom(TestBed.inject(SucursalService).getSucursales());

    expect(result).toEqual([branch]);
    expect(offlineDb.putCatalog).toHaveBeenCalledWith('empresa-3:usuario-9', 'sucursales:todas', [branch]);
  });
});
