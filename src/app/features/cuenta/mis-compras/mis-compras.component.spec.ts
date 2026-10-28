import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { CambiosService } from '../../../core/services/cambios.service';
import { VentaService } from '../../../core/services/venta.service';
import { MisComprasComponent } from './mis-compras.component';

describe('MisComprasComponent order detail', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisComprasComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: VentaService,
          useValue: { getMyPurchases: vi.fn(() => of({ compras_carrito: [], compras_presenciales: [] })) },
        },
        {
          provide: CambiosService,
          useValue: {
            getPolitica: vi.fn(() => of({ plazo_cambios_dias: 7 })),
            getMiSaldo: vi.fn(() => of({ saldo: 0 })),
          },
        },
      ],
    }).compileComponents();
  });

  it('presenta el detalle como un diálogo accesible y usa bolivianos', () => {
    const fixture = TestBed.createComponent(MisComprasComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectedOrden = {
      id: 4,
      tipo_venta: 'en linea',
      estado: 'pagada',
      total: 69.99,
      created_at: '2026-10-28T12:00:00Z',
      detalles: [{
        producto_nombre: 'polo',
        talla_nombre: 'L',
        color_nombre: 'negro',
        cantidad: 1,
        precio_unitario: 69.99,
        subtotal: 69.99,
      }],
    } as any;
    component.showDetailModal = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe('detalle-orden-titulo');
    expect(dialog.textContent).toContain('Bs. 69.99');
    expect(dialog.textContent).not.toContain('$69.99');
    expect(dialog.querySelector('.detalle-grid')).toBeTruthy();
    expect(dialog.querySelector('.table-responsive')).toBeTruthy();
  });
});
