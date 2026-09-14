import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnvioService } from '../../../core/services/envio.service';
import { Envio, EnvioUpdate } from '../../../core/models/envio.model';

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './envios.component.html',
  styleUrl: './envios.component.css',
})
export class EnviosComponent implements OnInit {
  private envioService = inject(EnvioService);

  envios = signal<Envio[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  selectedEnvio = signal<Envio | null>(null);
  isEditModalOpen = signal<boolean>(false);
  editEstado = signal<string>('pendiente');
  editDireccion = signal<string>('');
  editCiudad = signal<string>('');
  editCosto = signal<number>(0);

  ngOnInit(): void {
    this.loadEnvios();
  }

  loadEnvios(): void {
    this.isLoading.set(true);
    this.envioService.getEnvios().subscribe({
      next: (data) => {
        this.envios.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar la lista de envíos.');
        this.isLoading.set(false);
      },
    });
  }

  openEdit(e: Envio): void {
    this.selectedEnvio.set(e);
    this.editEstado.set(e.estado);
    this.editDireccion.set(e.direccion);
    this.editCiudad.set(e.ciudad);
    this.editCosto.set(e.costo);
    this.isEditModalOpen.set(true);
  }

  closeEdit(): void {
    this.isEditModalOpen.set(false);
  }

  saveEdit(): void {
    if (!this.selectedEnvio()) return;

    this.isLoading.set(true);
    const updateData: EnvioUpdate = {
      estado: this.editEstado(),
      direccion: this.editDireccion().trim(),
      ciudad: this.editCiudad().trim(),
      costo: this.editCosto(),
    };

    this.envioService.updateEnvio(this.selectedEnvio()!.id, updateData).subscribe({
      next: () => {
        this.successMessage.set(`Envío #${this.selectedEnvio()!.id} actualizado.`);
        this.closeEdit();
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al actualizar envío.');
        this.isLoading.set(false);
      },
    });
  }

  deleteEnvio(e: Envio): void {
    if (!confirm(`¿Eliminar el envío #${e.id}?`)) return;

    this.isLoading.set(true);
    this.envioService.deleteEnvio(e.id).subscribe({
      next: () => {
        this.successMessage.set(`Envío #${e.id} eliminado.`);
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar envío.');
        this.isLoading.set(false);
      },
    });
  }
}
