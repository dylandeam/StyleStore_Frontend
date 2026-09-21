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

  calculandoDistanciaState = signal<boolean>(false);
  get calculandoDistancia(): boolean { return this.calculandoDistanciaState(); }

  get conEnvio(): boolean { return this.conEnvioState(); }
  set conEnvio(val: boolean) {
    this.conEnvioState.set(val);
    if (val) {
      if (!this.distanciaKmState() || this.distanciaKmState() < 0.5) {
        this.distanciaKmState.set(3.5);
      }
      this.recalcularTarifaEnvio();
    } else {
      this.costoEnvioState.set(0);
    }
  }

  get ubicacionUrl(): string { return this.ubicacionUrlState(); }
  set ubicacionUrl(val: string) {
    this.ubicacionUrlState.set(val);
    if (this.conEnvio) {
      this.recalcularTarifaEnvio();
    }
  }

  get direccion(): string { return this.direccionState(); }
  set direccion(val: string) {
    this.direccionState.set(val);
    if (this.conEnvio) {
      this.recalcularTarifaEnvio();
    }
  }

  get ciudad(): string { return this.ciudadState(); }
  set ciudad(val: string) {
    this.ciudadState.set(val);
    if (this.conEnvio) {
      this.recalcularTarifaEnvio();
    }
  }

  get referencia(): string { return this.referenciaState(); }
  set referencia(val: string) { this.referenciaState.set(val); }

  get distanciaKm(): number { return this.distanciaKmState(); }
  set distanciaKm(val: number) {
    this.distanciaKmState.set(val);
    if (this.conEnvio) {
      this.recalcularTarifaEnvio();
    }
  }

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

  onSliderChange(): void {
    const dist = Math.max(0.5, this.distanciaKm || 0.5);
    this.costoEnvioState.set(Math.round((5.00 + dist * 0.60) * 100) / 100);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  latitudCliente = signal<number | null>(null);
  longitudCliente = signal<number | null>(null);
  obteniendoGps = signal<boolean>(false);

  extraerCoordsDeUrl(url?: string | null): { lat: number; lon: number } | null {
    if (!url) return null;
    try {
      const raw = String(url).trim();
      const str = decodeURIComponent(raw);
      const candidates = [str, raw];

      for (const target of candidates) {
        // Formato 1: /@-17.783321,-63.182134
        const m1 = target.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m1) return { lat: parseFloat(m1[1]), lon: parseFloat(m1[2]) };

        // Formato 2: Google Maps embed o place (!3d-17.xxx!4d-63.xxx)
        const m_embed = target.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (m_embed) return { lat: parseFloat(m_embed[1]), lon: parseFloat(m_embed[2]) };

        // Formato 3: Parámetros (?q=loc:-17.xxx,-63.xxx, ?q=-17.xxx,-63.xxx, ?ll=, ?sll=, ?query=, etc.)
        const m2 = target.match(/[?&](?:q|ll|sll|query|center|daddr|destination|saddr)=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/i);
        if (m2) return { lat: parseFloat(m2[1]), lon: parseFloat(m2[2]) };

        // Formato 4: /place/(-17.xxxx)[,+](-63.xxxx)
        const m3 = target.match(/\/place\/(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
        if (m3) return { lat: parseFloat(m3[1]), lon: parseFloat(m3[2]) };

        // Formato 5: Coordenadas explícitas consecutivas (ej: -17.783321, -63.182134)
        const m4 = target.match(/(-?\d{1,2}\.\d{3,})\s*[,; ]\s*(-?\d{1,3}\.\d{3,})/);
        if (m4) {
          const lat = parseFloat(m4[1]);
          const lon = parseFloat(m4[2]);
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return { lat, lon };
          }
        }
      }
    } catch (_) {}
    return null;
  }

  obtenerUbicacionActualGPS(): void {
    if (!navigator.geolocation) {
      this.mostrarToast('Tu navegador o dispositivo no soporta geolocalización GPS.');
      return;
    }
    this.obteniendoGps.set(true);
    this.cdr.markForCheck();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.obteniendoGps.set(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        this.latitudCliente.set(lat);
        this.longitudCliente.set(lon);
        this.ubicacionUrlState.set(`https://www.google.com/maps?q=${lat},${lon}`);
        this.mostrarToast('📍 ¡Ubicación GPS exacta capturada con éxito!');
        this.recalcularTarifaEnvio();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      (err) => {
        this.obteniendoGps.set(false);
        this.cdr.markForCheck();
        let msg = 'No se pudo obtener la ubicación GPS.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado. Puedes pegar tu enlace de Google Maps.';
        this.mostrarToast(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  calcularHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  recalcularTarifaEnvio(): void {
    if (!this.conEnvio) {
      this.costoEnvioState.set(0);
      return;
    }

    const suc = this.sucursalDespacho;
    const sucId = suc?.id || this.branchService.getSucursalId();
    const sucMaps = suc?.maps_url;
    const cliMaps = this.ubicacionUrl.trim();
    const cliDir = this.direccion.trim();

    // Actualizar coordenadas del cliente si se detectan en la URL ingresada
    const cCli = this.extraerCoordsDeUrl(cliMaps);
    if (cCli) {
      this.latitudCliente.set(cCli.lat);
      this.longitudCliente.set(cCli.lon);
    }

    const cSuc = this.extraerCoordsDeUrl(sucMaps);
    const latDest = this.latitudCliente() ?? (cCli ? cCli.lat : null);
    const lonDest = this.longitudCliente() ?? (cCli ? cCli.lon : null);

    // 1. Si ambas coordenadas están disponibles, calcular distancia Haversine inmediata
    if (latDest !== null && lonDest !== null && cSuc) {
      const d = this.calcularHaversineKm(cSuc.lat, cSuc.lon, latDest, lonDest);
      if (d >= 0.2) {
        this.distanciaKmState.set(d);
        this.costoEnvioState.set(Math.round((5.00 + d * 0.60) * 100) / 100);
      }
    } else {
      const distActual = Math.max(0.5, this.distanciaKm || 3.5);
      this.costoEnvioState.set(Math.round((5.00 + distActual * 0.60) * 100) / 100);
    }

    // 2. Cotizar y comparar ubicaciones en el Backend
    this.calculandoDistanciaState.set(true);
    this.envioService
      .cotizarPorDistancia({
        sucursal_id: sucId,
        sucursal_nombre: suc?.nombre,
        sucursal_direccion: suc?.direccion,
        sucursal_maps_url: sucMaps,
        ubicacion_url: cliMaps || undefined,
        direccion: cliDir || undefined,
        ciudad: this.ciudad.trim() || suc?.ciudad || 'Santa Cruz',
      })
      .subscribe({
        next: (res) => {
          this.calculandoDistanciaState.set(false);
          if (res && typeof res.costo === 'number') {
            if (res.distancia_km !== undefined && res.distancia_km !== null && res.distancia_km >= 0.2) {
              this.distanciaKmState.set(res.distancia_km);
            }
            this.costoEnvioState.set(res.costo);
            if (res.sucursal_maps_url && this.sucursalDespacho) {
              this.sucursalDespacho.maps_url = res.sucursal_maps_url;
            }
          }
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: () => {
          this.calculandoDistanciaState.set(false);
          const dist = Math.max(0.5, this.distanciaKm || 3.5);
          this.costoEnvioState.set(Math.round((5.00 + dist * 0.60) * 100) / 100);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });

    this.cdr.markForCheck();
    this.cdr.detectChanges();
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
    const subtotal = Number(this.carrito?.total) || 0;
    const envio = this.conEnvio ? (Number(this.costoEnvio) || 5.0) : 0;
    const total = subtotal + envio;
    return isNaN(total) || total <= 0 ? (this.conEnvio ? 5.0 : 0) : Math.round(total * 100) / 100;
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

  get sucursalDespacho(): { id?: number; nombre?: string; ciudad?: string; direccion?: string; maps_url?: string } | null {
    if (this.carrito?.items && this.carrito.items.length > 0) {
      const it = this.carrito.items.find((i) => i.sucursal_id || i.sucursal_nombre);
      if (it && (it.sucursal_id || it.sucursal_nombre)) {
        return {
          id: it.sucursal_id,
          nombre: it.sucursal_nombre,
          ciudad: it.sucursal_ciudad,
          direccion: it.sucursal_direccion,
          maps_url: (it as any).sucursal_maps_url || this.branchService.selectedSucursal()?.maps_url || this.branchService.selectedSucursal()?.ubicacion_url,
        };
      }
    }
    const s = this.branchService.selectedSucursal();
    if (s) {
      return {
        id: s.id,
        nombre: s.nombre || s.name,
        ciudad: s.ciudad || s.city,
        direccion: s.direccion || s.address,
        maps_url: s.maps_url || s.ubicacion_url,
      };
    }
    return null;
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

    // Snapshot robusto del monto total esperado (prendas + delivery) antes de confirmar el carrito
    const subtotalPrendas = Number(this.carrito?.total) || 0;
    const costoDelivery = this.conEnvio
      ? (Number(this.costoEnvio) || Math.round((5.00 + (Number(this.distanciaKm) || 0) * 0.60) * 100) / 100)
      : 0;
    const totalEsperado = Math.round((subtotalPrendas + costoDelivery) * 100) / 100;

    const dirFinal = this.conEnvio
      ? (this.direccion.trim() || (this.ubicacionUrl.trim() ? 'Ubicación GPS (según enlace de mapas)' : 'Entrega a domicilio'))
      : undefined;

    // 1. Confirmar el carrito con la sucursal de procedencia del inventario
    const sucIdFinal = this.sucursalDespacho?.id || this.branchService.getSucursalId();

    this.carritoService
      .confirmarCarrito({
        sucursal_id: sucIdFinal,
        metodo_pago: this.metodoPago,
        direccion_envio: dirFinal,
        despacho_delivery: this.conEnvio,
        despacho_yango: this.conEnvio,
      })
      .subscribe({
        next: (res) => {
          const ordenId = res.orden_venta_id;

          // 2. Si hay envío, registrar el despacho con Delivery StyleStore con la tarifa calculada
          if (this.conEnvio) {
            const ciudadDespacho = this.ciudad.trim() || this.sucursalDespacho?.ciudad || this.branchService.selectedSucursal()?.city || 'Santa Cruz';
            const costoDeliveryFinal = this.costoEnvio || Math.round((5.00 + (this.distanciaKm || 0) * 0.60) * 100) / 100;
            this.envioService
              .createEnvio({
                orden_venta_id: ordenId,
                direccion: dirFinal || 'Entrega a domicilio',
                ciudad: ciudadDespacho,
                referencia: this.referencia.trim() || undefined,
                ubicacion_url: this.ubicacionUrl.trim() || undefined,
                distancia_km: this.distanciaKm,
                costo: costoDeliveryFinal,
                latitud_destino: this.latitudCliente() ?? undefined,
                longitud_destino: this.longitudCliente() ?? undefined,
              })
              .subscribe({
                next: () => {
                  this.procederConPago(ordenId, totalEsperado);
                },
                error: () => {
                  this.procederConPago(ordenId, totalEsperado);
                },
              });
          } else {
            this.procederConPago(ordenId, totalEsperado);
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
    const totalSeguro = Number(total) || this.totalFinal || 5.0;
    this.paypalOrderId.set(ordenId);
    this.paypalToken.set(token);
    this.paypalApproveUrl.set(approveUrl);
    this.paypalTotal.set(Math.round(totalSeguro * 100) / 100);
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

  procederConPago(ordenId: number, montoEsperado?: number): void {
    const fallbackMonto = montoEsperado || this.totalFinal || 0;

    if (this.metodoPago === 'paypal') {
      // Checkout con PayPal v2
      localStorage.setItem('stylestore_pending_order_id', String(ordenId));
      const returnUrl = `${window.location.origin}/paypal-return`;
      this.pagosService.crearOrdenPayPal(ordenId, returnUrl).subscribe({
        next: (ppRes) => {
          this.isProcesando.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          const approveLink = ppRes.links?.find((l) => l.rel === 'approve')?.href || '';
          const montoTotal = Number(ppRes.orden_total_bob ?? ppRes.total ?? fallbackMonto ?? this.totalFinal ?? 0);
          this.abrirPayPalSandboxModal(ordenId, ppRes.id, approveLink, montoTotal);
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
        total: fallbackMonto,
        metodo: 'efectivo',
        mensaje: 'Tu pedido ha sido registrado con éxito para pago contra entrega o en caja.',
      });
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.cargarCarrito(); // Recargar carrito vacío
    }
  }
}
