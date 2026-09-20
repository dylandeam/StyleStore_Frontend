import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatbotChip {
  label: string;
  action: 'navigate';
  route: string;
}

export interface ChatbotResponse {
  respuesta: string;
  chips: ChatbotChip[];
  accion_ejecutable?: {
    tipo: string;
    producto_codigo: string;
    producto_nombre: string;
    precio: number;
    color_id?: number;
    color_nombre?: string;
    talla_id?: number;
    talla_nombre?: string;
    cantidad: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chatbot`;

  enviarMensaje(mensaje: string): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/mensaje`, { mensaje }).pipe(
      timeout(5000),
      catchError(() => {
        // Fallback local inmediato ante demoras de red o cold-start de backend
        const localResp = this.procesarRespuestaLocal(mensaje);
        return of(localResp);
      })
    );
  }

  procesarRespuestaLocal(mensaje: string): ChatbotResponse {
    const norm = mensaje
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .trim();

    if (norm.includes('pantalon') || norm.includes('jeans') || norm.includes('pantalones')) {
      return {
        respuesta:
          '👗 **¡Sí! Tenemos pantalones disponibles en StyleStore.**\n\nContamos con modelos en tendencia como **Pantalón Shein** y prendas de temporada. Puedes revisar existencias, colores y tallas en el catálogo interactivo.',
        chips: [
          { label: '👗 Ver Catálogo de Ropa', action: 'navigate', route: '/catalogo' },
          { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
          { label: '🛍️ Ir al Carrito', action: 'navigate', route: '/carrito' },
        ],
      };
    }

    if (
      norm.includes('camisa') ||
      norm.includes('polo') ||
      norm.includes('polera') ||
      norm.includes('manga larga')
    ) {
      return {
        respuesta:
          '👗 **¡Sí! Disponemos de camisas, polos y prendas superiores en StyleStore.**\n\nTenemos prendas como **Camisa Formal**, **Manga Larga Térmica** y **Polo**. Explora colores y existencias disponibles en el catálogo.',
        chips: [
          { label: '👗 Explorar Catálogo', action: 'navigate', route: '/catalogo' },
          { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
        ],
      };
    }

    if (
      norm.includes('sucursal') ||
      norm.includes('donde estan') ||
      norm.includes('direccion') ||
      norm.includes('ubicacion') ||
      norm.includes('horario')
    ) {
      return {
        respuesta:
          '🏬 **Nuestras Sucursales StyleStore:**\n\n• **Sucursal Central**: Av. América #450 (Cochabamba)\n• **Sucursal Equipetrol**: Av. San Martín #120 (Santa Cruz)\n• **Sucursal Sur**: Calacoto Calle 15 (La Paz)\n\nAtendemos de lunes a sábado de 09:00 a 20:00.',
        chips: [
          { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
          { label: '👗 Ver Catálogo', action: 'navigate', route: '/catalogo' },
        ],
      };
    }

    if (
      norm.includes('pago') ||
      norm.includes('paypal') ||
      norm.includes('qr') ||
      norm.includes('efectivo')
    ) {
      return {
        respuesta:
          '💳 **Métodos de Pago:**\n\n• **Online**: Pagos digitales seguros mediante **PayPal v2** (tarjetas Visa/Mastercard y saldo PayPal).\n• **Presencial**: En nuestras cajas POS aceptamos **Efectivo** (con cálculo de vuelto) y **QR Simple**.',
        chips: [
          { label: '💳 Ver Mis Pagos', action: 'navigate', route: '/cuenta/mis-pagos' },
          { label: '🛍️ Ir al Carrito', action: 'navigate', route: '/carrito' },
        ],
      };
    }

    if (norm.includes('envio') || norm.includes('yango') || norm.includes('delivery')) {
      return {
        respuesta:
          '🛵 **Envíos Yango Delivery:**\n\nRealizamos despachos a domicilio con Yango. Al finalizar tu pedido proporciona tu enlace de Google Maps o Apple Maps. La tarifa es variable según la app oficial de Yango.',
        chips: [
          { label: '📦 Mis Compras', action: 'navigate', route: '/cuenta/mis-compras' },
          { label: '🛍️ Ir al Carrito', action: 'navigate', route: '/carrito' },
        ],
      };
    }

    if (norm.includes('reserva')) {
      return {
        respuesta:
          '🔖 **Reservas en Tienda:**\n\nDisponible para clientes con al menos 1 compra previa pagada. Puedes reservar cualquier prenda por hasta 7 días indicando la sucursal de retiro.',
        chips: [
          { label: '👗 Ver Catálogo', action: 'navigate', route: '/catalogo' },
          { label: '📦 Mis Pedidos', action: 'navigate', route: '/cuenta/mis-compras' },
        ],
      };
    }

    if (norm.includes('cambio') || norm.includes('devolucion')) {
      return {
        respuesta:
          '🔄 **Garantía de Cambios y Devoluciones:**\n\nTienes un plazo de hasta 7 días posteriores a tu compra para solicitar cambio de prenda o devolución desde la sección Mis Compras.',
        chips: [
          { label: '🔄 Solicitar en Mis Compras', action: 'navigate', route: '/cuenta/mis-compras' },
          { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
        ],
      };
    }

    return {
      respuesta:
        '¡Hola! Como asistente virtual de StyleStore puedo colaborarte con sucursales, ropa disponible (pantalones, camisas, polos), envíos con Yango, reservas o cambios. ¿Qué te gustaría consultar?',
      chips: [
        { label: '👗 Catálogo de Ropa', action: 'navigate', route: '/catalogo' },
        { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
        { label: '📦 Mis Compras', action: 'navigate', route: '/cuenta/mis-compras' },
      ],
    };
  }
}
