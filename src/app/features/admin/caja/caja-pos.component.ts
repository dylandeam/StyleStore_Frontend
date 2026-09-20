import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../../core/services/venta.service';
import { PagosService, CobroCajaResponse } from '../../../core/services/pagos.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sucursal } from '../../../core/models/sucursal.model';
import { InventarioItem } from '../../../core/models/inventario.model';
import { VentaPresencialCreate } from '../../../core/models/venta.model';

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
  private sucursalService = inject(SucursalService);
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  // Tabs: 'ordenes' | 'venta_directa' | 'historial'
  activeTab: 'ordenes' | 'venta_directa' | 'historial' = 'ordenes';

  // Cobro de órdenes pendientes
  ordenesPendientes: any[] = [];
  ordenSeleccionada: any = null;
  loading: boolean = true;
  procesando: boolean = false;
  error: string | null = null;
  mensajeToast: string | null = null;

  // Cobro
  efectivoRecibido: number = 0;
  ticketEmitido: CobroCajaResponse | null = null;

  // Venta Directa en Mostrador
  sucursales: Sucursal[] = [];
  selectedSucursalId: number = 1;
  inventarioItems: InventarioItem[] = [];
  loadingInventario: boolean = false;
  searchItem: string = '';
  clienteCodigoVentaDirecta: string = 'GENERICO';
  metodoPagoDirecto: 'efectivo' | 'qr' = 'efectivo';
  efectivoRecibidoDirecto: number = 0;
  cartDirecto: { item: InventarioItem; cantidad: number; subtotal: number }[] = [];

  // Historial de Pagos
  historialPagos: any[] = [];
  loadingHistorial: boolean = false;
  reciboVisualizado: any = null;
  showModalRecibo: boolean = false;
  eliminandoPagoId: number | null = null;

  ngOnInit(): void {
    this.cargarOrdenesPendientes();
    this.cargarSucursales();
  }

  cargarOrdenesPendientes(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.ventaService.getVentas().subscribe({
      next: (ventas) => {
        this.ngZone.run(() => {
          this.ordenesPendientes = (ventas || []).filter((v: any) => {
            const est = (v.estado || '').toLowerCase();
            return est === 'pendiente_pago' || est === 'pendiente' || est.includes('pendiente');
          });
          this.loading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.markForCheck();
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
  }

  setBilletes(monto: number): void {
    this.efectivoRecibido = monto;
    this.cdr.markForCheck();
  }

  addBilletes(monto: number): void {
    this.efectivoRecibido = (this.efectivoRecibido || 0) + monto;
    this.cdr.markForCheck();
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

    this.pagosService.cobrarEnCaja(this.ordenSeleccionada.id, this.efectivoRecibido).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.ticketEmitido = res;
          this.mostrarToast(`¡Cobro exitoso! Ticket ${res.ticket_numero}`);
          this.cargarOrdenesPendientes();
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.error = err.error?.detail || 'Error al procesar cobro en caja.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  // Cobro directo para órdenes en línea (sin cálculo de vuelto)
  confirmarCobroOnline(orden: any): void {
    if (!orden) return;
    this.procesando = true;
    this.error = null;
    this.cdr.markForCheck();

    this.pagosService.confirmarOrdenOnline(orden.id).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.ticketEmitido = res;
          this.mostrarToast(`¡Orden en línea confirmada! Ticket ${res.ticket_numero}`);
          this.cargarOrdenesPendientes();
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.error = err.error?.detail || 'Error al confirmar cobro en línea.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.mensajeToast = null;
      this.cdr.markForCheck();
    }, 3500);
  }

  // ==========================================
  // PESTAÑAS Y CAMBIO DE VISTA
  // ==========================================

  switchTab(tab: 'ordenes' | 'venta_directa' | 'historial'): void {
    this.activeTab = tab;
    if (tab === 'venta_directa' && this.sucursales.length === 0) {
      this.cargarSucursales();
    } else if (tab === 'venta_directa' && this.inventarioItems.length === 0) {
      this.cargarInventarioSucursal();
    } else if (tab === 'historial') {
      this.cargarHistorialPagos();
    }
  }

  cargarSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (res) => {
        this.sucursales = res || [];
        const user = this.authService.currentUser();
        if (user && user.sucursal_id) {
          this.selectedSucursalId = user.sucursal_id;
        } else if (this.sucursales.length > 0 && !this.selectedSucursalId) {
          this.selectedSucursalId = this.sucursales[0].id;
        }
        this.cargarInventarioSucursal();
      },
      error: (err) => console.error('Error cargando sucursales:', err),
    });
  }

  cargarInventarioSucursal(): void {
    if (!this.selectedSucursalId) return;
    this.loadingInventario = true;
    this.inventarioService.getInventarioSucursal(this.selectedSucursalId).subscribe({
      next: (items) => {
        this.inventarioItems = (items || []).filter((it) => it.cantidad_disponible > 0);
        this.loadingInventario = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando inventario:', err);
        this.loadingInventario = false;
        this.cdr.markForCheck();
      },
    });
  }

  get filteredInventario(): InventarioItem[] {
    if (!this.searchItem.trim()) return this.inventarioItems;
    const q = this.searchItem.toLowerCase();
    return this.inventarioItems.filter(
      (it) =>
        it.producto_nombre.toLowerCase().includes(q) ||
        (it.color_nombre && it.color_nombre.toLowerCase().includes(q)) ||
        (it.talla_nombre && it.talla_nombre.toLowerCase().includes(q)) ||
        (it.producto_codigo && it.producto_codigo.toLowerCase().includes(q))
    );
  }

  agregarAlCarritoDirecto(item: InventarioItem): void {
    const itemId = item.stock_inventario_id || item.id || 0;
    const itemPrecio = item.precio_unitario || item.precio || 0;
    const itemStock = item.cantidad_disponible ?? item.cantidad ?? 0;

    const existing = this.cartDirecto.find((ci) => (ci.item.stock_inventario_id || ci.item.id) === itemId);
    if (existing) {
      if (existing.cantidad < itemStock) {
        existing.cantidad++;
        existing.subtotal = existing.cantidad * Number(itemPrecio);
      } else {
        this.mostrarToast(`Stock máximo disponible alcanzado (${itemStock}).`);
      }
    } else {
      this.cartDirecto.push({
        item,
        cantidad: 1,
        subtotal: Number(itemPrecio),
      });
    }
    this.efectivoRecibidoDirecto = this.totalVentaDirecta;
  }

  actualizarCantidadDirecto(index: number, delta: number): void {
    const ci = this.cartDirecto[index];
    const nuevaCant = ci.cantidad + delta;
    const itemPrecio = ci.item.precio_unitario || ci.item.precio || 0;
    const itemStock = ci.item.cantidad_disponible ?? ci.item.cantidad ?? 0;

    if (nuevaCant <= 0) {
      this.cartDirecto.splice(index, 1);
    } else if (nuevaCant <= itemStock) {
      ci.cantidad = nuevaCant;
      ci.subtotal = ci.cantidad * Number(itemPrecio);
    } else {
      this.mostrarToast(`Solo hay ${itemStock} unidades en stock.`);
    }
    this.efectivoRecibidoDirecto = this.totalVentaDirecta;
  }

  eliminarDelCarritoDirecto(index: number): void {
    this.cartDirecto.splice(index, 1);
    this.efectivoRecibidoDirecto = this.totalVentaDirecta;
  }

  get totalVentaDirecta(): number {
    return this.cartDirecto.reduce((acc, curr) => acc + curr.subtotal, 0);
  }

  get cambioDirecto(): number {
    if (this.metodoPagoDirecto !== 'efectivo') return 0;
    const diff = (this.efectivoRecibidoDirecto || 0) - this.totalVentaDirecta;
    return diff > 0 ? diff : 0;
  }

  get puedeCobrarDirecto(): boolean {
    if (this.cartDirecto.length === 0) return false;
    if (this.metodoPagoDirecto === 'efectivo') {
      return (this.efectivoRecibidoDirecto || 0) >= this.totalVentaDirecta;
    }
    return true; // Si es QR se puede confirmar directamente sin vuelto
  }

  setBilletesDirecto(monto: number): void {
    this.efectivoRecibidoDirecto = monto;
  }

  addBilletesDirecto(monto: number): void {
    this.efectivoRecibidoDirecto = (this.efectivoRecibidoDirecto || 0) + monto;
  }

  procesarVentaDirecta(): void {
    if (!this.puedeCobrarDirecto) return;

    this.procesando = true;
    this.error = null;

    const payload: VentaPresencialCreate = {
      codigo_cliente: this.clienteCodigoVentaDirecta || 'GENERICO',
      sucursal_id: this.selectedSucursalId,
      metodo_pago: this.metodoPagoDirecto,
      efectivo_recibido: this.metodoPagoDirecto === 'efectivo' ? this.efectivoRecibidoDirecto : this.totalVentaDirecta,
      items: this.cartDirecto.map((ci) => ({
        stock_inventario_id: ci.item.stock_inventario_id || ci.item.id || 0,
        cantidad: ci.cantidad,
      })),
    };

    this.ventaService.createVentaPresencial(payload).subscribe({
      next: (ordenCreada) => {
        this.procesando = false;
        this.ticketEmitido = {
          pago_id: ordenCreada.id,
          orden_venta_id: ordenCreada.id,
          total: Number(ordenCreada.total),
          efectivo_recibido: this.metodoPagoDirecto === 'efectivo' ? this.efectivoRecibidoDirecto : Number(ordenCreada.total),
          cambio_devuelto: this.cambioDirecto,
          ticket_numero: ordenCreada.ticket_numero || `TKT-${ordenCreada.id}`,
          fecha: ordenCreada.created_at || new Date().toISOString(),
        };
        this.ordenSeleccionada = ordenCreada;
        this.cartDirecto = [];
        this.mostrarToast(`¡Venta presencial completada! Ticket ${this.ticketEmitido.ticket_numero}`);
        this.cargarInventarioSucursal();
        this.cargarOrdenesPendientes();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.procesando = false;
        this.error = err.error?.detail || 'Error al procesar la venta directa en mostrador.';
        this.cdr.markForCheck();
      },
    });
  }

  nuevaVenta(): void {
    this.ordenSeleccionada = null;
    this.ticketEmitido = null;
    this.efectivoRecibido = 0;
    this.cartDirecto = [];
    this.efectivoRecibidoDirecto = 0;
    this.cdr.markForCheck();
  }

  // ==========================================
  // HISTORIAL DE PAGOS
  // ==========================================

  cargarHistorialPagos(): void {
    this.loadingHistorial = true;
    this.cdr.markForCheck();
    this.pagosService.getAllPagos().subscribe({
      next: (pagos) => {
        this.ngZone.run(() => {
          this.historialPagos = pagos || [];
          this.loadingHistorial = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error cargando historial de pagos:', err);
          this.loadingHistorial = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  verRecibo(pagoId: number): void {
    this.pagosService.getRecibo(pagoId).subscribe({
      next: (recibo) => {
        this.reciboVisualizado = recibo;
        this.showModalRecibo = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo cargar el recibo del pago.');
      },
    });
  }

  cerrarModalRecibo(): void {
    this.showModalRecibo = false;
    this.reciboVisualizado = null;
    this.cdr.markForCheck();
  }

  eliminarPago(pago: any): void {
    if (!confirm(`¿Estás seguro de anular/eliminar el Pago #${pago.id} asociado a la Orden #${pago.orden_venta_id}?`)) {
      return;
    }

    this.eliminandoPagoId = pago.id;
    this.pagosService.eliminarPago(pago.id).subscribe({
      next: () => {
        this.eliminandoPagoId = null;
        this.mostrarToast(`Pago #${pago.id} anulado correctamente.`);
        this.cargarHistorialPagos();
        this.cargarOrdenesPendientes();
      },
      error: (err) => {
        this.eliminandoPagoId = null;
        alert(err.error?.detail || 'No se pudo anular el pago.');
      },
    });
  }

  imprimirTicket(): void {
    const printEl = document.getElementById('ticket-pos-print') || document.getElementById('modal-ticket-print');
    if (!printEl) {
      window.print();
      return;
    }

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
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
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
          .receipt-header { text-align: center; margin-bottom: 8px; }
          .receipt-brand { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin: 0 0 2px; }
          .receipt-address { font-size: 10px; margin: 0 0 6px; color: #333; }
          .receipt-divider { overflow: hidden; margin: 6px 0; font-size: 11px; text-align: center; letter-spacing: -1px; }
          .receipt-line { font-size: 11px; margin-bottom: 2px; text-align: left; }
          .receipt-items { margin: 6px 0; }
          .receipt-item-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
          .it-desc { flex: 1; padding-right: 6px; }
          .it-price { white-space: nowrap; font-weight: bold; }
          .receipt-body { margin: 6px 0; }
          .receipt-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
          .cambio-row { font-size: 13px; font-weight: bold; }
          .receipt-footer { text-align: center; margin-top: 10px; font-size: 10px; color: #444; }
          .receipt-footer p { margin: 2px 0; }
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
}
