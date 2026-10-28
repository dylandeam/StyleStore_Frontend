import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER, Observable, of, Subject } from 'rxjs';

import { PagosService, PayPalCaptureResponse } from '../../../core/services/pagos.service';
import { PaypalReturnComponent } from './paypal-return.component';

describe('PaypalReturnComponent', () => {
  async function setup(
    captureResult: Observable<PayPalCaptureResponse>,
    queryParams: Observable<Record<string, string>> = of({ token: 'PAYPAL-ORDER-1', orden_id: '3' }),
  ) {
    const capturarOrdenPayPal = vi.fn(() => captureResult);
    await TestBed.configureTestingModule({
      imports: [PaypalReturnComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParams },
        },
        { provide: PagosService, useValue: { capturarOrdenPayPal } },
      ],
    }).compileComponents();
    return { fixture: TestBed.createComponent(PaypalReturnComponent), capturarOrdenPayPal };
  }

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('muestra solamente éxito cuando la captura termina correctamente', async () => {
    const response = {
      orden_venta_id: 3,
      monto: 78.63,
      estado: 'aprobado',
      paypal_capture_id: 'CAPTURE-123',
    };
    const { fixture, capturarOrdenPayPal } = await setup(of(response));

    fixture.detectChanges();

    expect(capturarOrdenPayPal).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.exito).toBe(true);
    expect(fixture.componentInstance.error).toBeNull();
    expect(fixture.nativeElement.querySelector('.result-card.success')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.result-card.error')).toBeNull();
  });

  it('mantiene el estado de validación si PayPal tarda más de diez segundos', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup(NEVER);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(10_000);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading).toBe(true);
    expect(fixture.componentInstance.error).toBeNull();
    expect(fixture.componentInstance.mensajeEspera).toContain('Seguimos verificando');
    expect(fixture.nativeElement.querySelector('.result-card.error')).toBeNull();
  });

  it('captura una sola vez aunque el navegador vuelva a emitir los parámetros', async () => {
    const params = new Subject<Record<string, string>>();
    const { fixture, capturarOrdenPayPal } = await setup(NEVER, params);
    fixture.detectChanges();

    params.next({ token: 'PAYPAL-ORDER-1', orden_id: '3' });
    params.next({ token: 'PAYPAL-ORDER-1', orden_id: '3' });

    expect(capturarOrdenPayPal).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.loading).toBe(true);
    expect(fixture.componentInstance.error).toBeNull();
  });
});
