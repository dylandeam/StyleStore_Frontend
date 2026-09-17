import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService, Carrito, CarritoItem } from '../../core/services/carrito.service';
import { PagosService } from '../../core/services/pagos.service';
import { EnvioService } from '../../core/services/envio.service';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css'],
})
export class CarritoComponent implements OnInit {
  private carritoService = inject(CarritoService);
  private pagosService = inject(PagosService);
  private envioService = inject(EnvioService);
  private uploadService = inject(UploadService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Signals para reactividad nativa e inmediata en Angular 21 (Zoneless)
  carritoData = signal<Carrito | null>(null);
  isLoading = signal<boolean>(true);
  isProcesando = signal<boolean>(false);
  toastMsg = signal<string | null>(null);

  // Opciones de Despacho / Envío
  conEnvioState = signal<boolean>(false);
  direccionState = signal<string>('');
  ciudadState = signal<string>('Santa Cruz');
  referenciaState = signal<string>('');
  distanciaKmState = signal<number>(4.5);
  costoEnvioState = signal<number>(12.0);

  // Método de pago elegido
  metodoPagoState = signal<'paypal' | 'efectivo'>('paypal');

  // Orden generada tras checkout
  ordenGeneradaState = signal<any>(null);
  ticketCobroState = signal<any>(null);

  // Getters y Setters para compatibilidad 100% con templates HTML y ngModel
  get carrito(): Carrito | null { return this.carritoData(); }
  set carrito(val: Carrito | null) { this.carritoData.set(val); }

  get loading(): boolean { return this.isLoading(); }
  set loading(val: boolean) { this.isLoading.set(val); }

  get procesando(): boolean { return this.isProcesando(); }
  set procesando(val: boolean) { this.isProcesando.set(val); }

  get mensajeToast(): string | null { return this.toastMsg(); }
  set mensajeToast(val: string | null) { this.toastMsg.set(val); }

  get conEnvio(): boolean { return this.conEnvioState(); }
  set conEnvio(val: boolean) { this.conEnvioState.set(val); }

  get direccion(): string { return this.direccionState(); }
  set direccion(val: string) { this.direccionState.set(val); }

  get ciudad(): string { return this.ciudadState(); }
  set ciudad(val: string) { this.ciudadState.set(val); }

  get referencia(): string { return this.referenciaState(); }
  set referencia(val: string) { this.referenciaState.set(val); }

  get distanciaKm(): number { return this.distanciaKmState(); }
  set distanciaKm(val: number) { this.distanciaKmState.set(val); }

  get costoEnvio(): number { return this.costoEnvioState(); }
  set costoEnvio(val: number) { this.costoEnvioState.set(val); }

  get metodoPago(): 'paypal' | 'efectivo' { return this.metodoPagoState(); }
  set metodoPago(val: 'paypal' | 'efectivo') { this.metodoPagoState.set(val); }

  get ordenGenerada(): any { return this.ordenGeneradaState(); }
  set ordenGenerada(val: any) { this.ordenGeneradaState.set(val); }

  get ticketCobro(): any { return this.ticketCobroState(); }
  set ticketCobro(val: any) { this.ticketCobroState.set(val); }

  ngOnInit(): void {
    this.cargarCarrito();
  }

  cargarCarrito(): void {
    this.isLoading.set(true);
    this.cdr.markForCheck();
    this.carritoService.getMyCart().subscribe({
      next: (data) => {
        this.carritoData.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cambiarCantidad(item: CarritoItem, delta: number): void {
    const nuevaCant = item.cantidad + delta;
    if (nuevaCant <= 0) {
      this.eliminarItem(item);
      return;
    }

    this.carritoService.updateItem(item.id, nuevaCant).subscribe({
      next: (cart) => {
        this.carritoData.set(cart);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarToast('No se pudo actualizar la cantidad.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  eliminarItem(item: CarritoItem): void {
    this.carritoService.removeItem(item.id).subscribe({
      next: (cart) => {
        this.carritoData.set(cart);
        this.mostrarToast('Prenda retirada del carrito.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarToast('Error al retirar la prenda.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cotizarEnvio(): void {
    this.envioService.cotizar(this.distanciaKm).subscribe({
      next: (res) => {
        this.costoEnvioState.set(res.costo);
        this.mostrarToast(`Tarifa estimada: Bs. ${res.costo} (${this.distanciaKm} km)`);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.costoEnvioState.set(12.0);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  get totalFinal(): number {
    const subtotal = this.carrito?.total || 0;
    return this.conEnvio ? subtotal + this.costoEnvio : subtotal;
  }

  getImageUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'productos') || 'assets/images/placeholder.jpg';
  }

  mostrarToast(msg: string): void {
    this.toastMsg.set(msg);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastMsg.set(null);
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 3500);
  }

  procesarCheckout(): void {
    if (!this.carrito || !this.carrito.items || this.carrito.items.length === 0) {
      this.mostrarToast('Tu carrito está vacío.');
      return;
    }

    if (this.conEnvio && (!this.direccion.trim() || !this.ciudad.trim())) {
      this.mostrarToast('Por favor introduce tu dirección y ciudad para el despacho.');
      return;
    }

    this.isProcesando.set(true);
    this.cdr.markForCheck();

    // 1. Confirmar el carrito en el backend y generar la orden de venta
    this.carritoService.confirmarCarrito().subscribe({
      next: (res) => {
        const ordenId = res.orden_venta_id;

        // 2. Si hay envío, registrar el despacho con Yango
        if (this.conEnvio) {
          this.envioService
            .createEnvio({
              orden_venta_id: ordenId,
              direccion: this.direccion,
              ciudad: this.ciudad,
              referencia: this.referencia,
              distancia_km: this.distanciaKm,
              costo: this.costoEnvio,
            })
            .subscribe({
              next: () => {
                this.procederConPago(ordenId);
              },
              error: () => {
                this.procederConPago(ordenId);
              },
            });
        } else {
          this.procederConPago(ordenId);
        }
      },
      error: (err) => {
        this.isProcesando.set(false);
        const msg = err?.error?.detail || 'Error al confirmar el pedido. Verifica el stock disponible.';
        this.mostrarToast(msg);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  procederConPago(ordenId: number): void {
    if (this.metodoPago === 'paypal') {
      // Checkout con PayPal v2
      this.pagosService.crearOrdenPayPal(ordenId).subscribe({
        next: (ppRes) => {
          this.isProcesando.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          // Buscar enlace de aprobación
          const approveLink = ppRes.links?.find((l) => l.rel === 'approve')?.href;
          if (approveLink) {
            window.location.href = approveLink;
          } else {
            // Si es mock o local
            this.router.navigate(['/paypal-return'], {
              queryParams: { token: ppRes.id, orden_id: ordenId },
            });
          }
        },
        error: (err) => {
          this.isProcesando.set(false);
          const msg = err?.error?.detail || 'Error al iniciar PayPal. Inténtalo de nuevo.';
          this.mostrarToast(msg);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
    } else {
      // Pago en Efectivo / Contra Entrega o Caja
      this.isProcesando.set(false);
      this.ordenGeneradaState.set({
        orden_id: ordenId,
        total: this.totalFinal,
        metodo: 'efectivo',
        mensaje: 'Tu pedido ha sido registrado con éxito para pago contra entrega o en caja.',
      });
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.cargarCarrito(); // Recargar carrito vacío
    }
  }
}
