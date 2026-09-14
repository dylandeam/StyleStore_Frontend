import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservaService } from '../../../core/services/reserva.service';
import { Reserva } from '../../../core/models/reserva.model';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.css',
})
export class ReservasComponent implements OnInit {
  private reservaService = inject(ReservaService);

  reservas = signal<Reserva[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modales
  selectedReserva = signal<Reserva | null>(null);
  isDetailModalOpen = signal<boolean>(false);
  isTicketModalOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.loadReservas();
  }

  loadReservas(): void {
    this.isLoading.set(true);
    this.reservaService.getReservas().subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar las reservas.');
        this.isLoading.set(false);
      },
    });
  }

  openDetail(r: Reserva): void {
    this.selectedReserva.set(r);
    this.isDetailModalOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
  }

  openTicket(r: Reserva): void {
    this.selectedReserva.set(r);
    this.isTicketModalOpen.set(true);
  }

  closeTicket(): void {
    this.isTicketModalOpen.set(false);
  }

  printTicket(): void {
    window.print();
  }

  updateEstado(reservaId: number, nuevoEstado: string): void {
    this.isLoading.set(true);
    this.reservaService.updateEstado(reservaId, nuevoEstado).subscribe({
      next: (updated) => {
        this.successMessage.set(`Estado de la reserva #${reservaId} actualizado a "${nuevoEstado}".`);
        this.loadReservas();
        if (this.selectedReserva()?.id === reservaId) {
          this.selectedReserva.set(updated);
        }
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al actualizar el estado.');
        this.isLoading.set(false);
      },
    });
  }

  deleteReserva(reservaId: number): void {
    if (!confirm(`¿Eliminar o cancelar la reserva #${reservaId}?`)) return;

    this.isLoading.set(true);
    this.reservaService.deleteReserva(reservaId).subscribe({
      next: () => {
        this.successMessage.set(`Reserva #${reservaId} eliminada.`);
        this.closeDetail();
        this.loadReservas();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar reserva.');
        this.isLoading.set(false);
      },
    });
  }
}
