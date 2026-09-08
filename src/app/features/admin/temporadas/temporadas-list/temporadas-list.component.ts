import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemporadasService } from '../../../../core/services/temporadas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Temporada, TemporadaCreate } from '../../../../core/models/temporada.model';

@Component({
  selector: 'app-temporadas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './temporadas-list.component.html',
  styleUrls: ['./temporadas-list.component.css'],
})
export class TemporadasListComponent implements OnInit {
  private temporadasService = inject(TemporadasService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  temporadas = signal<Temporada[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: TemporadaCreate = {
    nombre: '',
  };

  ngOnInit(): void {
    this.loadTemporadas();
  }

  loadTemporadas(): void {
    this.isLoading.set(true);
    this.temporadasService.getTemporadas().subscribe({
      next: (data) => {
        this.temporadas.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredTemporadas(): Temporada[] {
    if (!this.searchTerm.trim()) return this.temporadas();
    const term = this.searchTerm.toLowerCase();
    return this.temporadas().filter((t) => t.nombre.toLowerCase().includes(term));
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = { nombre: '' };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(temp: Temporada): void {
    this.isEditing.set(true);
    this.editingId = temp.id;
    this.formData = { nombre: temp.nombre };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  saveTemporada(): void {
    if (!this.formData.nombre.trim()) {
      this.modalError.set('El nombre de la temporada es obligatorio.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingId) {
      this.temporadasService.updateTemporada(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Temporada actualizada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadTemporadas();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar temporada.');
        },
      });
    } else {
      this.temporadasService.createTemporada(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Temporada creada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadTemporadas();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear temporada.');
        },
      });
    }
  }

  deleteTemporada(temp: Temporada): void {
    if (!confirm(`¿Está seguro de eliminar la temporada "${temp.nombre}"?`)) {
      return;
    }

    this.temporadasService.deleteTemporada(temp.id).subscribe({
      next: () => {
        this.loadTemporadas();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se puede eliminar la temporada.');
      },
    });
  }
}
