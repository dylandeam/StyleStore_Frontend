import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Categoria, CategoriaCreate } from '../../../../core/models/categoria.model';
import { PlatformTenantContextService } from '../../../../core/services/platform-tenant-context.service';

@Component({
  selector: 'app-categorias-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias-list.component.html',
  styleUrls: ['./categorias-list.component.css'],
})
export class CategoriasListComponent implements OnInit {
  private categoriasService = inject(CategoriasService);
  private authService = inject(AuthService);
  private tenantContext = inject(PlatformTenantContextService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  get needsTenantSelection(): boolean {
    return !!this.authService.currentUser()?.is_platform_admin && !this.tenantContext.selected();
  }

  categorias = signal<Categoria[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';

  // Modal State
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: CategoriaCreate = {
    nombre: '',
  };

  ngOnInit(): void {
    this.loadCategorias();
  }

  loadCategorias(): void {
    this.isLoading.set(true);
    this.categoriasService.getCategorias().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredCategorias(): Categoria[] {
    if (!this.searchTerm.trim()) {
      return this.categorias();
    }
    const term = this.searchTerm.toLowerCase();
    return this.categorias().filter((c) => c.nombre.toLowerCase().includes(term));
  }

  openCreateModal(): void {
    if (this.needsTenantSelection) return;
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = { nombre: '' };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(cat: Categoria): void {
    this.isEditing.set(true);
    this.editingId = cat.id;
    this.formData = { nombre: cat.nombre };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  saveCategoria(): void {
    if (!this.formData.nombre.trim()) {
      this.modalError.set('El nombre de la categoría es obligatorio.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingId) {
      this.categoriasService.updateCategoria(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Categoría actualizada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadCategorias();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar categoría.');
        },
      });
    } else {
      this.categoriasService.createCategoria(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Categoría creada exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadCategorias();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear categoría.');
        },
      });
    }
  }

  deleteCategoria(cat: Categoria): void {
    if (!confirm(`¿Está seguro de eliminar la categoría "${cat.nombre}"?`)) {
      return;
    }

    this.categoriasService.deleteCategoria(cat.id).subscribe({
      next: () => {
        this.loadCategorias();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se puede eliminar la categoría.');
      },
    });
  }
}
