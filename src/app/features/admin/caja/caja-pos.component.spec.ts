import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { PagosService } from '../../../core/services/pagos.service';
import { PromocionesService } from '../../../core/services/promociones.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { UploadService } from '../../../core/services/upload.service';
import { VentaService } from '../../../core/services/venta.service';
import { CajaPosComponent } from './caja-pos.component';

describe('CajaPosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CajaPosComponent],
      providers: [
        {
          provide: VentaService,
          useValue: {
            getVentas: () => of([
              {
                id: 19,
                estado: 'pendiente_pago',
                tipo_venta: 'en linea',
                metodo_pago: 'paypal',
                total: 79.9,
                detalles: [],
              },
            ]),
          },
        },
        { provide: PagosService, useValue: { getQRConfig: () => of(null) } },
        { provide: SucursalService, useValue: { getSucursales: () => of([]) } },
        { provide: InventarioService, useValue: { getInventarioSucursal: () => of([]) } },
        { provide: UploadService, useValue: { getFileUrl: (path: string) => path } },
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: PromocionesService, useValue: {} },
        { provide: ClientesService, useValue: { getClientes: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('keeps payment management focused on pending orders and history', () => {
    const fixture = TestBed.createComponent(CajaPosComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Nueva Venta Directa en Mostrador');
    expect(text).toContain('Cobrar Órdenes Pendientes');
    expect(text).toContain('Historial de Pagos');
  });

  it('renders the direct-sale workflow without the payments header when embedded in sales', () => {
    const fixture = TestBed.createComponent(CajaPosComponent);
    fixture.componentRef.setInput('ventaDirectaOnly', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Canasta de Mostrador');
    expect(element.textContent).not.toContain('Gestionar Pagos');
    expect(element.querySelector('.pos-container')?.classList).toContain('direct-sale-only');
  });
});
