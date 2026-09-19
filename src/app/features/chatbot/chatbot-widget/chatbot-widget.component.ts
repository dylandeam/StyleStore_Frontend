import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService, ChatbotChip } from '../../../core/services/chatbot.service';

interface ChatMessage {
  remitente: 'bot' | 'user';
  texto: string;
  hora: string;
  chips?: ChatbotChip[];
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
  private router = inject(Router);

  isOpen = false;
  inputText = '';
  isLoading = false;

  messages: ChatMessage[] = [
    {
      remitente: 'bot',
      texto: '¡Hola! 👋 Soy el asistente virtual de StyleStore. ¿En qué te puedo asesorar hoy?',
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
  }

  getHoraActual(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sendMessage(): void {
    const texto = this.inputText.trim();
    if (!texto || this.isLoading) return;

    this.messages.push({
      remitente: 'user',
      texto: texto,
      hora: this.getHoraActual(),
    });

    this.inputText = '';
    this.isLoading = true;

    this.chatbotService.enviarMensaje(texto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messages.push({
          remitente: 'bot',
          texto: res.respuesta,
          hora: this.getHoraActual(),
          chips: res.chips,
        });
        this.scrollToBottom();
      },
      error: () => {
        this.isLoading = false;
        this.messages.push({
          remitente: 'bot',
          texto: 'Lo siento, tuve un problema al procesar tu consulta. Por favor intenta nuevamente.',
          hora: this.getHoraActual(),
        });
        this.scrollToBottom();
      },
    });

    this.scrollToBottom();
  }

  clickChip(chip: ChatbotChip): void {
    if (chip.action === 'navigate') {
      this.router.navigate([chip.route]);
      // Opcionalmente mantener el chat abierto para que siga consultando
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chatbot-messages-container');
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  }
}
