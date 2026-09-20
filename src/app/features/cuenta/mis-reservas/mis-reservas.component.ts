import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReservaService } from '../../../core/services/reserva.service';
import { Reserva } from '../../../core/models/reserva.model';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-reservas.component.html',
  styleUrls: ['./mis-reservas.component.css'],
})
export class MisReservasComponent implements OnInit {
  private reservaService = inject(ReservaService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  reservas: Reserva[] = [];
  filtroEstado: 'todas' | 'pendiente' | 'completada' | 'cancelada' = 'todas';

  selectedReserva: Reserva | null = null;
  showTicketModal = false;
  showDetailModal = false;
  cancelingId: number | null = null;

  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas(): void {
    this.loading = true;
    this.reservaService.getMyReservas().subscribe({
      next: (data) => {
        this.reservas = data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Error al cargar tus reservas.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get reservasFiltradas(): Reserva[] {
    if (this.filtroEstado === 'todas') {
      return this.reservas;
    }
    return this.reservas.filter((r) => r.estado?.toLowerCase() === this.filtroEstado);
  }

  setFiltro(estado: 'todas' | 'pendiente' | 'completada' | 'cancelada'): void {
    this.filtroEstado = estado;
    this.cdr.markForCheck();
  }

  abrirTicket(r: Reserva): void {
    this.selectedReserva = r;
    this.showTicketModal = true;
    this.cdr.markForCheck();
  }

  cerrarTicket(): void {
    this.showTicketModal = false;
    this.cdr.markForCheck();
  }

  imprimirTicket(): void {
    window.print();
  }

  abrirDetalle(r: Reserva): void {
    this.selectedReserva = r;
    this.showDetailModal = true;
    this.cdr.markForCheck();
  }

  cerrarDetalle(): void {
    this.showDetailModal = false;
    this.cdr.markForCheck();
  }

  cancelarReserva(id: number): void {
    const confirmacion = window.confirm(
      `¿Deseas cancelar la reserva #${id}? El stock reservado será liberado inmediatamente para la venta general.`
    );
    if (!confirmacion) return;

    this.cancelingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.reservaService.cancelarReserva(id).subscribe({
      next: (reservaActualizada) => {
        this.cancelingId = null;
        this.successMessage = `Reserva #${id} cancelada exitosamente. Las prendas fueron devueltas al inventario.`;
        // Actualizar elemento en la lista local sin recarga forzada
        const idx = this.reservas.findIndex((r) => r.id === id);
        if (idx !== -1) {
          this.reservas[idx] = reservaActualizada;
        } else {
          this.cargarReservas();
        }
        if (this.selectedReserva?.id === id) {
          this.selectedReserva = reservaActualizada;
        }
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 5000);
      },
      error: (err) => {
        this.cancelingId = null;
        this.errorMessage = err.error?.detail || 'Error al intentar cancelar la reserva.';
        this.cdr.markForCheck();
      },
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return 'badge-pending';
      case 'completada':
        return 'badge-completed';
      case 'cancelada':
        return 'badge-canceled';
      default:
        return 'badge-default';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return 'Pendiente de Retiro';
      case 'completada':
        return 'Retirada / Completada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return estado;
    }
  }

  calcularTotalItems(r: Reserva): number {
    if (!r.detalles) return 0;
    return r.detalles.reduce((acc, d) => acc + (d.cantidad || 0), 0);
  }
}
