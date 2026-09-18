import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../../core/services/venta.service';
import { PagosService, CobroCajaResponse } from '../../../core/services/pagos.service';

@Component({
  selector: 'app-caja-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caja-pos.component.html',
  styleUrls: ['./caja-pos.component.css'],
})
export class CajaPosComponent implements OnInit {
  private ventaService = inject(VentaService);
  private pagosService = inject(PagosService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  ordenesPendientes: any[] = [];
  ordenSeleccionada: any = null;
  loading: boolean = true;
  procesando: boolean = false;
  error: string | null = null;
  mensajeToast: string | null = null;

  // Cobro
  efectivoRecibido: number = 0;
  ticketEmitido: CobroCajaResponse | null = null;

  ngOnInit(): void {
    this.cargarOrdenesPendientes();
  }

  cargarOrdenesPendientes(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.ventaService.getVentas().subscribe({
      next: (ventas) => {
        this.ngZone.run(() => {
          // Filtrar órdenes pendientes de cobro (compatible con 'pendiente_pago' y 'pendiente')
          this.ordenesPendientes = (ventas || []).filter((v: any) => {
            const est = (v.estado || '').toLowerCase();
            return est === 'pendiente_pago' || est === 'pendiente' || est.includes('pendiente');
          });
          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
    });
  }

  seleccionarOrden(orden: any): void {
    this.ordenSeleccionada = orden;
    this.efectivoRecibido = Number(orden.total);
    this.ticketEmitido = null;
    this.error = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  setBilletes(monto: number): void {
    this.efectivoRecibido = monto;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  addBilletes(monto: number): void {
    this.efectivoRecibido = (this.efectivoRecibido || 0) + monto;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  get cambio(): number {
    if (!this.ordenSeleccionada) return 0;
    const diff = (this.efectivoRecibido || 0) - Number(this.ordenSeleccionada.total);
    return diff > 0 ? diff : 0;
  }

  get puedeCobrar(): boolean {
    if (!this.ordenSeleccionada) return false;
    return (this.efectivoRecibido || 0) >= Number(this.ordenSeleccionada.total);
  }

  procesarCobro(): void {
    if (!this.puedeCobrar) {
      this.error = 'El monto recibido es inferior al total de la orden.';
      return;
    }

    this.procesando = true;
    this.error = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.pagosService.cobrarEnCaja(this.ordenSeleccionada.id, this.efectivoRecibido).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.ticketEmitido = res;
          this.mostrarToast(`¡Cobro exitoso! Ticket ${res.ticket_numero}`);
          this.cargarOrdenesPendientes();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.error = err.error?.detail || 'Error al procesar cobro en caja.';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
    });
  }

  imprimirTicket(): void {
    const printEl = document.getElementById('ticket-pos-print');
    if (!printEl) {
      window.print();
      return;
    }

    // Usar un iframe aislado exclusivo para imprimir el ticket térmico
    let printIframe = document.getElementById('pos-print-ticket-iframe') as HTMLIFrameElement;
    if (printIframe) {
      printIframe.remove();
    }

    printIframe = document.createElement('iframe');
    printIframe.id = 'pos-print-ticket-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket de Caja - StyleStore</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 76mm;
            margin: 0 auto;
            padding: 10px 4px;
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 8px;
          }
          .receipt-brand {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 2px;
            margin: 0 0 2px;
          }
          .receipt-address {
            font-size: 10px;
            margin: 0 0 6px;
            color: #333;
          }
          .receipt-divider {
            overflow: hidden;
            margin: 6px 0;
            font-size: 11px;
            text-align: center;
            letter-spacing: -1px;
          }
          .receipt-line {
            font-size: 11px;
            margin-bottom: 2px;
            text-align: left;
          }
          .receipt-items {
            margin: 6px 0;
          }
          .receipt-item-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 3px;
          }
          .it-desc {
            flex: 1;
            padding-right: 6px;
          }
          .it-price {
            white-space: nowrap;
            font-weight: bold;
          }
          .receipt-body {
            margin: 6px 0;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 4px 0;
          }
          .cambio-row {
            font-size: 13px;
            font-weight: bold;
          }
          .receipt-footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
            color: #444;
          }
          .receipt-footer p {
            margin: 2px 0;
          }
        </style>
      </head>
      <body>
        ${printEl.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 250);
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensajeToast = null;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 3500);
  }

  nuevaVenta(): void {
    this.ordenSeleccionada = null;
    this.ticketEmitido = null;
    this.efectivoRecibido = 0;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
