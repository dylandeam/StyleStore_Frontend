import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER, Observable, of } from 'rxjs';

import { PagosService, PayPalCaptureResponse } from '../../../core/services/pagos.service';
import { PaypalReturnComponent } from './paypal-return.component';

describe('PaypalReturnComponent', () => {
  async function setup(captureResult: Observable<PayPalCaptureResponse>) {
    const capturarOrdenPayPal = vi.fn(() => captureResult);
    await TestBed.configureTestingModule({
      imports: [PaypalReturnComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ token: 'PAYPAL-ORDER-1', orden_id: '3' }) },
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
});
