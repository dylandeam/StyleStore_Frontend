import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, of } from 'rxjs';

import { BranchSelectionService } from '../../core/services/branch-selection.service';
import { CarritoService } from '../../core/services/carrito.service';
import { EnvioService } from '../../core/services/envio.service';
import { PagosService } from '../../core/services/pagos.service';
import { PromocionesService } from '../../core/services/promociones.service';
import { ReservaService } from '../../core/services/reserva.service';
import { UploadService } from '../../core/services/upload.service';
import { CarritoComponent } from './carrito.component';

describe('CarritoComponent delivery checkout', () => {
  const checkout = vi.fn((_payload: Record<string, unknown>) => NEVER);
  const crearOrdenPayPal = vi.fn((_ordenId: number, _returnUrl?: string, _cancelUrl?: string) => NEVER);
  const cotizarPorDistancia = vi.fn(() => of({
    distancia_km: 6.06,
    costo: 8.64,
    costo_envio: 8.64,
    moneda: 'BOB',
    destino: { lat: -17.783321, lon: -63.182134 },
  }));

  beforeEach(async () => {
    checkout.mockClear();
    crearOrdenPayPal.mockClear();
    cotizarPorDistancia.mockClear();
    await TestBed.configureTestingModule({
      imports: [CarritoComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: CarritoService, useValue: { checkout, getMyCart: vi.fn() } },
        { provide: PagosService, useValue: { crearOrdenPayPal } },
        { provide: EnvioService, useValue: { cotizarPorDistancia } },
        { provide: UploadService, useValue: {} },
        { provide: ReservaService, useValue: {} },
        { provide: PromocionesService, useValue: {} },
        {
          provide: BranchSelectionService,
          useValue: {
            getSucursalId: () => 1,
            selectedSucursal: () => ({
              id: 1,
              nombre: 'Sucursal Equipetrol',
              ciudad: 'Santa Cruz',
              maps_url: 'https://maps.google.com/?q=-17.769500,-63.196200',
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('acepta para PayPal una tarifa que el servidor resolvió desde un enlace corto de Maps', () => {
    const fixture = TestBed.createComponent(CarritoComponent);
    const component = fixture.componentInstance;
    component.carritoData.set({
      items: [{ sucursal_id: 1, sucursal_nombre: 'Sucursal Equipetrol' }],
      total: 69.99,
    } as any);
    component.conEnvioState.set(true);
    component.ubicacionUrlState.set('https://maps.app.goo.gl/enlace-corto');

    component.recalcularTarifaEnvio();

    expect(component.cotizacionEnvioValidada()).toBe(true);
    expect(component.latitudCliente()).toBe(-17.783321);
    expect(component.longitudCliente()).toBe(-63.182134);
    expect(component.costoEnvio).toBe(8.64);

    component.procesarCheckout();

    expect(checkout).toHaveBeenCalledOnce();
    expect(checkout.mock.calls[0][0]).toMatchObject({
      ubicacion_url: 'https://maps.app.goo.gl/enlace-corto',
      latitud_destino: -17.783321,
      longitud_destino: -63.182134,
      distancia_km: 6.06,
    });
  });

  it('evita que una PWA obsoleta intercepte el retorno crítico de PayPal', () => {
    const fixture = TestBed.createComponent(CarritoComponent);
    const component = fixture.componentInstance;
    component.metodoPago = 'paypal';

    component.procederConPago(17, 69.99);

    expect(crearOrdenPayPal).toHaveBeenCalledOnce();
    expect(crearOrdenPayPal.mock.calls[0][1]).toBe(
      `${window.location.origin}/paypal-return?ngsw-bypass=true`,
    );
  });
});
