import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { AuthService } from '../../../../core/services/auth.service';
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
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return !this.authService.currentUser()?.is_platform_admin
      && (role === 'administrador' || role === 'encargado_sucursal');
  }

  get isPlatformAdmin(): boolean {
    return !!this.authService.currentUser()?.is_platform_admin;
  }

  sucursales = signal<Sucursal[]>([]);
  isLoading = signal<boolean>(false);
  filterCity = '';
  selectedTenantFilter = '';

  get tenantOptions(): Array<{ id: number; nombre: string }> {
    const options = new Map<number, string>();
    for (const branch of this.sucursales()) {
      if (branch.empresa_id) options.set(branch.empresa_id, branch.empresa_nombre || `Tenant #${branch.empresa_id}`);
    }
    return [...options.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

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
    maps_url: '',
    active: true,
    hora_apertura: '09:00',
    hora_cierre: '18:00',
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
    let list = this.sucursales();
    if (this.selectedTenantFilter) {
      list = list.filter((branch) => branch.empresa_id === Number(this.selectedTenantFilter));
    }
    if (!this.filterCity) return list;
    return list.filter(
      (s) =>
        s.city.toLowerCase().includes(this.filterCity.toLowerCase()) ||
        s.name.toLowerCase().includes(this.filterCity.toLowerCase()) ||
        !!s.empresa_nombre?.toLowerCase().includes(this.filterCity.toLowerCase())
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
      maps_url: '',
      active: true,
      hora_apertura: '09:00',
      hora_cierre: '18:00',
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
      maps_url: s.maps_url || s.ubicacion_url || '',
      active: s.active,
      hora_apertura: s.hora_apertura || '09:00',
      hora_cierre: s.hora_cierre || '18:00',
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
    if (!this.formData.hora_apertura || !this.formData.hora_cierre || this.formData.hora_apertura >= this.formData.hora_cierre) {
      this.modalError.set('El horario de apertura debe ser anterior al horario de cierre.');
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
