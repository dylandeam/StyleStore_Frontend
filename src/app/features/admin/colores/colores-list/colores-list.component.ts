import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColoresService } from '../../../../core/services/colores.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Color, ColorCreate } from '../../../../core/models/color.model';

@Component({
  selector: 'app-colores-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colores-list.component.html',
  styleUrls: ['./colores-list.component.css'],
})
export class ColoresListComponent implements OnInit {
  private coloresService = inject(ColoresService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  colores = signal<Color[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: ColorCreate = {
    nombre: '',
  };

  ngOnInit(): void {
    this.loadColores();
  }

  loadColores(): void {
    this.isLoading.set(true);
    this.coloresService.getColores().subscribe({
      next: (data) => {
        this.colores.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredColores(): Color[] {
    if (!this.searchTerm.trim()) return this.colores();
    const term = this.searchTerm.toLowerCase();
    return this.colores().filter((c) => c.nombre.toLowerCase().includes(term));
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = { nombre: '' };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(color: Color): void {
    this.isEditing.set(true);
    this.editingId = color.id;
    this.formData = { nombre: color.nombre };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  saveColor(): void {
    if (!this.formData.nombre.trim()) {
      this.modalError.set('El nombre del color es obligatorio.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingId) {
      this.coloresService.updateColor(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Color actualizado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadColores();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar color.');
        },
      });
    } else {
      this.coloresService.createColor(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Color creado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadColores();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear color.');
        },
      });
    }
  }

  deleteColor(color: Color): void {
    if (!confirm(`¿Está seguro de eliminar el color "${color.nombre}"?`)) {
      return;
    }

    this.coloresService.deleteColor(color.id).subscribe({
      next: () => {
        this.loadColores();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se puede eliminar el color.');
      },
    });
  }
}
