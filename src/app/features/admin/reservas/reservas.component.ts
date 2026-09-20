import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { Reserva } from '../../../core/models/reserva.model';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.css',
})
export class ReservasComponent implements OnInit {
  private reservaService = inject(ReservaService);
  private sucursalService = inject(SucursalService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  reservas = signal<Reserva[]>([]);
  sucursales = signal<Sucursal[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filtros de visualización
  selectedSucursalId = signal<number | null>(null);
  selectedEstado = signal<string | null>(null);

  // Modales
  selectedReserva = signal<Reserva | null>(null);
  isDetailModalOpen = signal<boolean>(false);
  isTicketModalOpen = signal<boolean>(false);

  ngOnInit(): void {
    const role = (this.authService.currentUser()?.role || '').toLowerCase();
    if (role === 'cliente') {
      this.router.navigate(['/cuenta/mis-reservas']);
      return;
    }
    this.loadSucursales();
    this.loadReservas();
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (list) => {
        this.sucursales.set(list || []);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  loadReservas(): void {
    this.isLoading.set(true);
    this.reservaService
      .getReservas({
        sucursal_id: this.selectedSucursalId(),
        estado: this.selectedEstado(),
      })
      .subscribe({
        next: (data) => {
          this.reservas.set(data || []);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage.set('Error al cargar las reservas.');
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onFilterChange(): void {
    this.loadReservas();
  }

  openDetail(r: Reserva): void {
    this.selectedReserva.set(r);
    this.isDetailModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.cdr.markForCheck();
  }

  openTicket(r: Reserva): void {
    this.selectedReserva.set(r);
    this.isTicketModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeTicket(): void {
    this.isTicketModalOpen.set(false);
    this.cdr.markForCheck();
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
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al actualizar el estado.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  cancelarReserva(reservaId: number): void {
    if (!confirm(`¿Deseas cancelar la reserva #${reservaId}? Se liberará el stock reservado a inventario.`)) return;

    this.isLoading.set(true);
    this.reservaService.cancelarReserva(reservaId).subscribe({
      next: (updated) => {
        this.successMessage.set(`Reserva #${reservaId} cancelada y stock liberado correctamente.`);
        this.loadReservas();
        if (this.selectedReserva()?.id === reservaId) {
          this.selectedReserva.set(updated);
        }
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al cancelar la reserva.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  deleteReserva(reservaId: number): void {
    if (!confirm(`¿Eliminar definitivamente la reserva #${reservaId}?`)) return;

    this.isLoading.set(true);
    this.reservaService.deleteReserva(reservaId).subscribe({
      next: () => {
        this.successMessage.set(`Reserva #${reservaId} eliminada.`);
        this.closeDetail();
        this.loadReservas();
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar reserva.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
