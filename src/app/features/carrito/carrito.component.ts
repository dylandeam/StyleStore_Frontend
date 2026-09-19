import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService, Carrito, CarritoItem } from '../../core/services/carrito.service';
import { PagosService } from '../../core/services/pagos.service';
import { EnvioService } from '../../core/services/envio.service';
import { UploadService } from '../../core/services/upload.service';
import { BranchSelectionService } from '../../core/services/branch-selection.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css'],
})
export class CarritoComponent implements OnInit {
  private router = inject(Router);
  private carritoService = inject(CarritoService);
  private pagosService = inject(PagosService);
  private envioService = inject(EnvioService);
  private uploadService = inject(UploadService);
  private cdr = inject(ChangeDetectorRef);
  public branchService = inject(BranchSelectionService);

  // Estados Reactivos
  carritoData = signal<Carrito | null>(null);
  isLoading = signal<boolean>(true);
  isProcesando = signal<boolean>(false);
  toastMsg = signal<string | null>(null);

  // Opciones de Despacho / Envío
  conEnvioState = signal<boolean>(false);
  ubicacionUrlState = signal<string>('');
  direccionState = signal<string>('');
  ciudadState = signal<string>('Santa Cruz');
  referenciaState = signal<string>('');
  distanciaKmState = signal<number>(4.5);
  costoEnvioState = signal<number>(0);

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

  get ubicacionUrl(): string { return this.ubicacionUrlState(); }
  set ubicacionUrl(val: string) { this.ubicacionUrlState.set(val); }

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

  get totalFinal(): number {
    return this.carrito?.total || 0;
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

    if (this.conEnvio) {
      if (!this.ubicacionUrl.trim() && !this.direccion.trim()) {
        this.mostrarToast('Por favor pega el enlace de Google Maps / Apple Maps o tu dirección para el despacho.');
        return;
      }
      if (!this.ciudad.trim()) {
        this.mostrarToast('Por favor indica la ciudad de entrega.');
        return;
      }
    }

    this.isProcesando.set(true);
    this.cdr.markForCheck();

    const dirFinal = this.conEnvio
      ? (this.direccion.trim() || (this.ubicacionUrl.trim() ? 'Ubicación GPS (según enlace de mapas)' : 'Entrega a domicilio'))
      : undefined;

    // 1. Confirmar el carrito en el backend y generar la orden de venta indicando la sucursal
    this.carritoService
      .confirmarCarrito({
        sucursal_id: this.branchService.getSucursalId(),
        metodo_pago: this.metodoPago,
        direccion_envio: dirFinal,
        despacho_yango: this.conEnvio,
      })
      .subscribe({
        next: (res) => {
          const ordenId = res.orden_venta_id;

          // 2. Si hay envío, registrar el despacho con Yango (costo 0 en tienda, pago directo a repartidor Yango)
          if (this.conEnvio) {
            this.envioService
              .createEnvio({
                orden_venta_id: ordenId,
                direccion: dirFinal || 'Entrega a domicilio',
                ciudad: this.ciudad.trim() || this.branchService.selectedSucursal()?.city || 'Santa Cruz',
                referencia: this.referencia.trim() || undefined,
                ubicacion_url: this.ubicacionUrl.trim() || undefined,
                costo: 0,
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

  // PayPal Sandbox Modal State
  showPayPalModal = signal<boolean>(false);
  paypalStep = signal<'login' | 'approve' | 'processing'>('login');
  paypalOrderId = signal<number>(0);
  paypalToken = signal<string>('');
  paypalApproveUrl = signal<string>('');
  paypalTotal = signal<number>(0);
  paypalEmail = signal<string>('comprador.sandbox@stylestore.com');
  paypalPassword = signal<string>('SandboxPass2026!');
  paypalErrorMessage = signal<string>('');

  abrirPayPalSandboxModal(ordenId: number, token: string, approveUrl: string, total: number): void {
    this.paypalOrderId.set(ordenId);
    this.paypalToken.set(token);
    this.paypalApproveUrl.set(approveUrl);
    this.paypalTotal.set(total);
    this.paypalStep.set('login');
    this.paypalErrorMessage.set('');
    this.showPayPalModal.set(true);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  cerrarPayPalModal(): void {
    this.showPayPalModal.set(false);
    this.isProcesando.set(false);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  autocompletarCredencialesSandbox(): void {
    this.paypalEmail.set('comprador.sandbox@stylestore.com');
    this.paypalPassword.set('SandboxPass2026!');
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  avanzarAprobacionSandbox(): void {
    if (!this.paypalEmail().trim() || !this.paypalPassword().trim()) {
      this.paypalErrorMessage.set('Por favor ingresa tu correo y contraseña de prueba de PayPal Sandbox.');
      return;
    }
    this.paypalErrorMessage.set('');
    this.paypalStep.set('approve');
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  abrirEnPayPalReal(): void {
    const url = this.paypalApproveUrl() || 'https://www.sandbox.paypal.com';
    window.open(url, '_blank');
  }

  completarPagoSandbox(): void {
    this.paypalStep.set('processing');
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    const token = this.paypalToken();
    const ordenId = this.paypalOrderId();

    this.pagosService.capturarOrdenPayPal(token, ordenId).subscribe({
      next: () => {
        this.showPayPalModal.set(false);
        this.router.navigate(['/paypal-return'], {
          queryParams: { token: token, orden_id: ordenId },
        });
      },
      error: (err) => {
        this.paypalStep.set('approve');
        this.paypalErrorMessage.set(err.error?.detail || 'No se pudo completar el pago con PayPal.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  procederConPago(ordenId: number): void {
    if (this.metodoPago === 'paypal') {
      // Checkout con PayPal v2
      const returnUrl = `${window.location.origin}/paypal-return`;
      this.pagosService.crearOrdenPayPal(ordenId, returnUrl).subscribe({
        next: (ppRes) => {
          this.isProcesando.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          const approveLink = ppRes.links?.find((l) => l.rel === 'approve')?.href || '';
          this.abrirPayPalSandboxModal(ordenId, ppRes.id, approveLink, this.totalFinal);
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
