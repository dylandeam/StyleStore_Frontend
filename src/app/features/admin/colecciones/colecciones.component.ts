import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColeccionService } from '../../../core/services/coleccion.service';
import { Coleccion, ColeccionCreate, ColeccionUpdate } from '../../../core/models/coleccion.model';

@Component({
  selector: 'app-colecciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colecciones.component.html',
  styleUrl: './colecciones.component.css',
})
export class ColeccionesComponent implements OnInit {
  private coleccionService = inject(ColeccionService);

  colecciones = signal<Coleccion[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modal
  isModalOpen = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedId = signal<number | null>(null);

  nombre = signal<string>('');
  descripcion = signal<string>('');
  active = signal<boolean>(true);

  ngOnInit(): void {
    this.loadColecciones();
  }

  loadColecciones(): void {
    this.isLoading.set(true);
    this.coleccionService.getColecciones().subscribe({
      next: (data) => {
        this.colecciones.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Error al cargar las colecciones.');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.selectedId.set(null);
    this.nombre.set('');
    this.descripcion.set('');
    this.active.set(true);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(col: Coleccion): void {
    this.isEditing.set(true);
    this.selectedId.set(col.id);
    this.nombre.set(col.nombre);
    this.descripcion.set(col.descripcion || '');
    this.active.set(col.active);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveColeccion(): void {
    if (!this.nombre().trim()) {
      this.errorMessage.set('El nombre de la colección es obligatorio.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.selectedId()) {
      const updateData: ColeccionUpdate = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        active: this.active(),
      };
      this.coleccionService.updateColeccion(this.selectedId()!, updateData).subscribe({
        next: () => {
          this.successMessage.set('Colección actualizada con éxito.');
          this.closeModal();
          this.loadColecciones();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al actualizar la colección.');
          this.isLoading.set(false);
        },
      });
    } else {
      const createData: ColeccionCreate = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
      };
      this.coleccionService.createColeccion(createData).subscribe({
        next: () => {
          this.successMessage.set('Colección creada con éxito.');
          this.closeModal();
          this.loadColecciones();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al crear la colección.');
          this.isLoading.set(false);
        },
      });
    }
  }

  deleteColeccion(col: Coleccion): void {
    if (!confirm(`¿Está seguro de eliminar la colección "${col.nombre}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this.coleccionService.deleteColeccion(col.id).subscribe({
      next: () => {
        this.successMessage.set('Colección eliminada con éxito.');
        this.loadColecciones();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se puede eliminar la colección.');
        this.isLoading.set(false);
      },
    });
  }
}
