import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService, ChatbotChip } from '../../../core/services/chatbot.service';
import { CarritoService } from '../../../core/services/carrito.service';

interface ChatMessage {
  remitente: 'bot' | 'user';
  texto: string;
  hora: string;
  chips?: ChatbotChip[];
  accionEjecutada?: boolean;
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css'],
})
export class ChatbotWidgetComponent implements OnInit {
  private chatbotService = inject(ChatbotService);
  private carritoService = inject(CarritoService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  isOpen = false;
  inputText = '';
  isLoading = false;

  messages: ChatMessage[] = [
    {
      remitente: 'bot',
      texto: '¡Hola! 👋 Soy el asistente virtual inteligente de StyleStore. Puedo asesorarte con recomendaciones de moda, sucursales o agregar prendas directamente a tu carrito si me dices por ejemplo: "agrega el vestido rojo al carrito". ¿En qué te colaboro hoy?',
      hora: this.getHoraActual(),
      chips: [
        { label: '📍 Ver Sucursales', action: 'navigate', route: '/admin/sucursales' },
        { label: '👗 Catálogo de Ropa', action: 'navigate', route: '/catalogo' },
        { label: '📦 Mis Compras', action: 'navigate', route: '/cuenta/mis-compras' },
        { label: '💳 Métodos de Pago', action: 'navigate', route: '/cuenta/mis-pagos' },
      ],
    },
  ];

  ngOnInit(): void {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollToBottom();
    }
  }

  getHoraActual(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sendMessage(): void {
    const texto = this.inputText.trim();
    if (!texto || this.isLoading) return;

    this.messages = [
      ...this.messages,
      {
        remitente: 'user',
        texto: texto,
        hora: this.getHoraActual(),
      },
    ];

    this.inputText = '';
    this.isLoading = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.scrollToBottom();

    this.chatbotService.enviarMensaje(texto).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          const botMsg: ChatMessage = {
            remitente: 'bot',
            texto: res.respuesta,
            hora: this.getHoraActual(),
            chips: res.chips,
            accionEjecutada: !!res.accion_ejecutable,
          };
          this.messages = [...this.messages, botMsg];

          // Ejecutar acción directa al carrito si aplica (v7 Punto 8)
          if (res.accion_ejecutable && res.accion_ejecutable.tipo === 'add_to_cart') {
            this.ejecutarAgregarAlCarrito(res.accion_ejecutable);
          }

          this.cdr.markForCheck();
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.messages = [
            ...this.messages,
            {
              remitente: 'bot',
              texto: 'Lo siento, tuve un problema temporal al procesar tu consulta. Por favor intenta nuevamente.',
              hora: this.getHoraActual(),
            },
          ];
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      },
    });
  }

  private ejecutarAgregarAlCarrito(accion: any): void {
    const cod = accion.producto_codigo;
    const cant = accion.cantidad || 1;

    this.carritoService.getProductoDetalle(cod).subscribe({
      next: (detalle) => {
        // Encontrar una variante con existencias
        let stockId = 0;
        if (detalle.variantes) {
          for (const v of detalle.variantes) {
            if (v.existencias && v.existencias.length > 0) {
              const ex = v.existencias.find((e) => e.cantidad > 0) || v.existencias[0];
              stockId = ex.stock_inventario_id;
              break;
            }
          }
        }

        if (stockId > 0) {
          this.carritoService.addItem(stockId, cant).subscribe({
            next: () => {
              console.log(`Prenda ${cod} agregada exitosamente al carrito por el Chatbot.`);
            },
            error: (err) => console.error('Error agregando prenda desde el chatbot:', err),
          });
        }
      },
      error: (e) => console.error('Error obteniendo detalle de producto en chatbot:', e),
    });
  }

  clickChip(chip: ChatbotChip): void {
    if (chip.action === 'navigate') {
      this.router.navigate([chip.route]);
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chatbot-messages-container');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 50);
  }
}
