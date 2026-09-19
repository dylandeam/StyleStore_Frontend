import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PagosService } from '../../../core/services/pagos.service';

@Component({
  selector: 'app-paypal-return',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './paypal-return.component.html',
  styleUrls: ['./paypal-return.component.css'],
})
export class PaypalReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pagosService = inject(PagosService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loading: boolean = true;
  exito: boolean = false;
  error: string | null = null;
  ordenId: number | null = null;
  captureId: string | null = null;
  monto: number = 0;

  ngOnInit(): void {
    // Timeout de seguridad: Si pasan 10 segundos y sigue cargando, liberar estado
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        if (!this.exito && !this.error) {
          this.error = 'El tiempo de espera para validar con PayPal ha expirado. Si tu saldo fue debitado, tu orden será confirmada en breve.';
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    }, 10000);

    this.route.queryParams.subscribe((params) => {
      const token = params['token'] || params['token_id'] || params['paymentId'];
      let ordenId = Number(params['orden_id']);

      if (!ordenId || isNaN(ordenId)) {
        const stored = localStorage.getItem('stylestore_pending_order_id');
        if (stored) {
          ordenId = Number(stored);
        }
      }

      if (token) {
        this.ordenId = ordenId || null;
        this.capturarPago(token, ordenId || 0);
      } else {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = 'Parámetros de retorno de PayPal incompletos.';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  capturarPago(token: string, ordenId: number): void {
    this.pagosService.capturarOrdenPayPal(token, ordenId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.exito = true;
          this.captureId = res.paypal_capture_id || token;
          this.monto = res.monto || 0;
          this.ordenId = res.orden_venta_id || ordenId;
          localStorage.removeItem('stylestore_pending_order_id');
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = err.error?.detail || 'No se pudo verificar la captura de PayPal.';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
    });
  }
}
