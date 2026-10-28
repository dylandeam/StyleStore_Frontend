import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CategoriasService } from '../../../core/services/categorias.service';
import { ProductoService } from '../../../core/services/producto.service';
import { PromocionesService } from '../../../core/services/promociones.service';
import { TemporadasService } from '../../../core/services/temporadas.service';
import { PromocionesListComponent } from './promociones-list.component';

describe('PromocionesListComponent', () => {
  const createCodigo = vi.fn();
  const promocionesService = {
    getTodasLasPromociones: vi.fn(() => of([])),
    getAgrupadas: vi.fn(() => of([])),
    getCodigos: vi.fn(() => of([])),
    createCodigo,
  };

  beforeEach(async () => {
    createCodigo.mockReset();
    createCodigo.mockReturnValue(of({
      id: 1,
      empresa_id: 7,
      codigo: 'VERANO15',
      porcentaje: 15,
      aplica_online: true,
      aplica_presencial: false,
      usos_actual: 0,
      active: true,
    }));

    await TestBed.configureTestingModule({
      imports: [PromocionesListComponent],
      providers: [
        { provide: PromocionesService, useValue: promocionesService },
        { provide: ProductoService, useValue: { getProductos: vi.fn(() => of([])) } },
        { provide: CategoriasService, useValue: { getCategorias: vi.fn(() => of([])) } },
        { provide: TemporadasService, useValue: { getTemporadas: vi.fn(() => of([])) } },
      ],
    }).compileComponents();
  });

  it('expone la creación de códigos desde el encabezado de Gestionar promociones', () => {
    const fixture = TestBed.createComponent(PromocionesListComponent);
    fixture.detectChanges();

    const action = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Crear código de descuento'));

    expect(action).toBeTruthy();
    action?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.seccionActiva).toBe('codigos');
    expect(fixture.nativeElement.textContent).toContain('El cliente podrá escribirlo en el carrito');
  });

  it('normaliza y crea un código limitado a los canales seleccionados', () => {
    const fixture = TestBed.createComponent(PromocionesListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.codigoNombre = ' verano15 ';
    component.codigoDescripcion = 'Campaña de verano';
    component.codigoPorcentaje = 15;
    component.codigoOnline = true;
    component.codigoPresencial = false;
    component.codigoMaxUsos = 25;
    component.guardarCodigo();

    expect(createCodigo).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'VERANO15',
      descripcion: 'Campaña de verano',
      porcentaje: 15,
      aplica_online: true,
      aplica_presencial: false,
      max_usos: 25,
      active: true,
    }));
    expect(component.codigoNombre).toBe('');
    expect(component.successMsg()).toContain('Código de descuento creado');
  });
});
