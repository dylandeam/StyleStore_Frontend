import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TallasService } from '../../../../core/services/tallas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Talla, TallaCreate } from '../../../../core/models/talla.model';

@Component({
  selector: 'app-tallas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tallas-list.component.html',
  styleUrls: ['./tallas-list.component.css'],
})
export class TallasListComponent implements OnInit {
  private tallasService = inject(TallasService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  tallas = signal<Talla[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: TallaCreate = {
    nombre: '',
  };

  ngOnInit(): void {
    this.loadTallas();
  }

  loadTallas(): void {
    this.isLoading.set(true);
    this.tallasService.getTallas().subscribe({
      next: (data) => {
        this.tallas.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredTallas(): Talla[] {
    if (!this.searchTerm.trim()) return this.tallas();
    const term = this.searchTerm.toLowerCase();
    return this.tallas().filter((t) => t.nombre.toLowerCase().includes(term));
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = { nombre: '' };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(talla: Talla): void {
    this.isEditing.set(true);
    this.editingId = talla.id;
    this.formData = { nombre: talla.nombre };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  saveTalla(): void {
    if (!this.formData.nombre.trim()) {
      this.modalError.set('El nombre de la talla es obligatorio.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingId) {
      this.tallasService.updateTalla(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Talla actualizada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadTallas();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar talla.');
        },
      });
    } else {
      this.tallasService.createTalla(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Talla creada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadTallas();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear talla.');
        },
      });
    }
  }

  deleteTalla(talla: Talla): void {
    if (!confirm(`¿Está seguro de eliminar la talla "${talla.nombre}"?`)) {
      return;
    }

    this.tallasService.deleteTalla(talla.id).subscribe({
      next: () => {
        this.loadTallas();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se puede eliminar la talla.');
      },
    });
  }
}
