import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../../core/services/venta.service';
import { OrdenVenta } from '../../../core/models/venta.model';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css',
})
export class VentasComponent implements OnInit {
  private ventaService = inject(VentaService);

  ventas = signal<OrdenVenta[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  selectedVenta = signal<OrdenVenta | null>(null);
  isDetailModalOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.loadVentas();
  }

  loadVentas(): void {
    this.isLoading.set(true);
    this.ventaService.getVentas().subscribe({
      next: (data) => {
        this.ventas.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar ventas.');
        this.isLoading.set(false);
      },
    });
  }

  openDetail(v: OrdenVenta): void {
    this.selectedVenta.set(v);
    this.isDetailModalOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
  }

  deleteVenta(v: OrdenVenta): void {
    if (!confirm(`¿Eliminar el registro de venta #${v.id}?`)) return;

    this.isLoading.set(true);
    this.ventaService.deleteVenta(v.id).subscribe({
      next: () => {
        this.successMessage.set(`Venta #${v.id} eliminada exitosamente.`);
        this.loadVentas();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar venta.');
        this.isLoading.set(false);
      },
    });
  }
}
