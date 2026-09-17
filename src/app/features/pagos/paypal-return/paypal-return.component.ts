import { Component, OnInit, inject } from '@angular/core';
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

  loading: boolean = true;
  exito: boolean = false;
  error: string | null = null;
  ordenId: number | null = null;
  captureId: string | null = null;
  monto: number = 0;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'] || params['token_id'];
      const ordenId = Number(params['orden_id']);

      if (token && ordenId) {
        this.ordenId = ordenId;
        this.capturarPago(token, ordenId);
      } else {
        this.loading = false;
        this.error = 'Parámetros de retorno de PayPal incompletos.';
      }
    });
  }

  capturarPago(token: string, ordenId: number): void {
    this.pagosService.capturarOrdenPayPal(token, ordenId).subscribe({
      next: (res) => {
        this.loading = false;
        this.exito = true;
        this.captureId = res.paypal_capture_id || token;
        this.monto = res.monto || 0;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'No se pudo verificar la captura de PayPal.';
      },
    });
  }
}
