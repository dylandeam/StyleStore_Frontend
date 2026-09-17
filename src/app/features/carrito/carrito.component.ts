import { Component, OnInit, inject } from '@angular/core';
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

  carrito: Carrito | null = null;
  loading: boolean = true;
  procesando: boolean = false;
  mensajeToast: string | null = null;

  // Opciones de Despacho / Envío
  conEnvio: boolean = false;
  direccion: string = '';
  ciudad: string = 'Santa Cruz';
  referencia: string = '';
  distanciaKm: number = 4.5;
  costoEnvio: number = 12.0;

  // Método de pago elegido
  metodoPago: 'paypal' | 'efectivo' = 'paypal';

  // Orden generada tras checkout
  ordenGenerada: any = null;
  ticketCobro: any = null;

  ngOnInit(): void {
    this.cargarCarrito();
  }

  cargarCarrito(): void {
    this.loading = true;
    this.carritoService.getMyCart().subscribe({
      next: (data) => {
        this.carrito = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
        this.carrito = cart;
      },
      error: () => {
        this.mostrarToast('No se pudo actualizar la cantidad.');
      },
    });
  }

  eliminarItem(item: CarritoItem): void {
    this.carritoService.removeItem(item.id).subscribe({
      next: (cart) => {
        this.carrito = cart;
        this.mostrarToast('Prenda retirada del carrito.');
      },
      error: () => {
        this.mostrarToast('Error al retirar la prenda.');
      },
    });
  }

  cotizarEnvio(): void {
    this.envioService.cotizar(this.distanciaKm).subscribe({
      next: (res) => {
        this.costoEnvio = res.costo;
        this.mostrarToast(`Tarifa estimada: $${res.costo} (${this.distanciaKm} km)`);
      },
      error: () => {
        this.costoEnvio = 12.0;
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
    this.mensajeToast = msg;
    setTimeout(() => {
      this.mensajeToast = null;
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

    this.procesando = true;

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
      error: () => {
        this.procesando = false;
        this.mostrarToast('Error al confirmar el pedido. Verifica el stock disponible.');
      },
    });
  }

  procederConPago(ordenId: number): void {
    if (this.metodoPago === 'paypal') {
      // Checkout con PayPal v2
      this.pagosService.crearOrdenPayPal(ordenId).subscribe({
        next: (ppRes) => {
          this.procesando = false;
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
        error: () => {
          this.procesando = false;
          this.mostrarToast('Error al iniciar PayPal. Inténtalo de nuevo.');
        },
      });
    } else {
      // Pago en Efectivo / Contra Entrega o Caja
      this.procesando = false;
      this.ordenGenerada = {
        orden_id: ordenId,
        total: this.totalFinal,
        metodo: 'efectivo',
        mensaje: 'Tu pedido ha sido registrado con éxito para pago contra entrega o en caja.',
      };
      this.cargarCarrito(); // Recargar carrito vacío
    }
  }
}
