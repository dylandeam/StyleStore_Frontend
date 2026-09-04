import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { Sucursal, SucursalCreate } from '../../../../core/models/sucursal.model';

@Component({
  selector: 'app-sucursales-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sucursales-list.component.html',
  styleUrls: ['./sucursales-list.component.css'],
})
export class SucursalesListComponent implements OnInit {
  private sucursalService = inject(SucursalService);

  sucursales = signal<Sucursal[]>([]);
  isLoading = signal<boolean>(false);
  filterCity = '';

  // Modal State
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: SucursalCreate = {
    name: '',
    city: '',
    address: '',
    phone: '',
    active: true,
  };

  ngOnInit(): void {
    this.loadSucursales();
  }

  loadSucursales(): void {
    this.isLoading.set(true);
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredSucursales(): Sucursal[] {
    if (!this.filterCity) return this.sucursales();
    return this.sucursales().filter(
      (s) =>
        s.city.toLowerCase().includes(this.filterCity.toLowerCase()) ||
        s.name.toLowerCase().includes(this.filterCity.toLowerCase())
    );
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      name: '',
      city: '',
      address: '',
      phone: '',
      active: true,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(s: Sucursal): void {
    this.isEditing.set(true);
    this.editingId = s.id;
    this.formData = {
      name: s.name,
      city: s.city,
      address: s.address,
      phone: s.phone,
      active: s.active,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitSucursal(): void {
    if (!this.formData.name || !this.formData.city || !this.formData.address || !this.formData.phone) {
      this.modalError.set('Todos los campos son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');
    this.modalSuccess.set('');

    if (this.isEditing() && this.editingId) {
      this.sucursalService.updateSucursal(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Sucursal actualizada con éxito.');
          this.loadSucursales();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar sucursal.');
        },
      });
    } else {
      this.sucursalService.createSucursal(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Sucursal creada con éxito.');
          this.loadSucursales();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear sucursal.');
        },
      });
    }
  }

  deleteSucursal(id: number, name: string): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar la sucursal "${name}"?`)) {
      return;
    }

    this.sucursalService.deleteSucursal(id).subscribe({
      next: () => {
        this.loadSucursales();
      },
      error: (err) => {
        alert(err.error?.detail || 'Error al eliminar la sucursal.');
      },
    });
  }
}
