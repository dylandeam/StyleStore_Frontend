import { Component, OnInit, inject } from '@angular/core';
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
    this.ventaService.getVentas().subscribe({
      next: (ventas) => {
        // Filtrar órdenes pendientes
        this.ordenesPendientes = ventas.filter((v: any) => v.estado === 'pendiente');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  seleccionarOrden(orden: any): void {
    this.ordenSeleccionada = orden;
    this.efectivoRecibido = Number(orden.total);
    this.ticketEmitido = null;
    this.error = null;
  }

  setBilletes(monto: number): void {
    this.efectivoRecibido = monto;
  }

  addBilletes(monto: number): void {
    this.efectivoRecibido = (this.efectivoRecibido || 0) + monto;
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

    this.pagosService.cobrarEnCaja(this.ordenSeleccionada.id, this.efectivoRecibido).subscribe({
      next: (res) => {
        this.procesando = false;
        this.ticketEmitido = res;
        this.mostrarToast(`¡Cobro exitoso! Ticket ${res.ticket_numero}`);
        this.cargarOrdenesPendientes();
      },
      error: (err) => {
        this.procesando = false;
        this.error = err.error?.detail || 'Error al procesar cobro en caja.';
      },
    });
  }

  imprimirTicket(): void {
    window.print();
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    setTimeout(() => {
      this.mensajeToast = null;
    }, 3500);
  }

  nuevaVenta(): void {
    this.ordenSeleccionada = null;
    this.ticketEmitido = null;
    this.efectivoRecibido = 0;
  }
}
