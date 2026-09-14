import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColeccionService } from '../../../core/services/coleccion.service';
import { AuthService } from '../../../core/services/auth.service';
import { Coleccion, ColeccionCreate, ColeccionUpdate, ProductoColeccion } from '../../../core/models/coleccion.model';

@Component({
  selector: 'app-colecciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colecciones.component.html',
  styleUrl: './colecciones.component.css',
})
export class ColeccionesComponent implements OnInit {
  private coleccionService = inject(ColeccionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // User permissions
  currentUser = this.authService.currentUser;
  canManage = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  });

  // State
  colecciones = signal<Coleccion[]>([]);
  selectedColeccion = signal<Coleccion | null>(null);
  productos = signal<ProductoColeccion[]>([]);
  isLoading = signal<boolean>(false);
  isLoadingProductos = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // View toggle for admins: 'catalogo' (interactive gallery) or 'tabla' (crud list)
  vistaModo = signal<'catalogo' | 'tabla'>('catalogo');

  // Modal Crear / Editar
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

        // Auto-select first or maintain selection
        const currentSel = this.selectedColeccion();
        if (data.length > 0) {
          if (currentSel) {
            const updated = data.find((c) => c.id === currentSel.id);
            if (updated) {
              this.selectColeccion(updated);
            } else {
              this.selectColeccion(data[0]);
            }
          } else {
            this.selectColeccion(data[0]);
          }
        } else {
          this.selectedColeccion.set(null);
          this.productos.set([]);
        }
      },
      error: (err) => {
        this.errorMessage.set('Error al cargar las colecciones de moda.');
        this.isLoading.set(false);
      },
    });
  }

  selectColeccion(col: Coleccion): void {
    this.selectedColeccion.set(col);
    this.loadProductos(col.id);
  }

  loadProductos(coleccionId: number): void {
    this.isLoadingProductos.set(true);
    this.coleccionService.getProductosByColeccion(coleccionId).subscribe({
      next: (prods) => {
        this.productos.set(prods);
        this.isLoadingProductos.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.isLoadingProductos.set(false);
      },
    });
  }

  verProductoEnCatalogo(prod: ProductoColeccion): void {
    this.router.navigate(['/admin/productos'], { queryParams: { search: prod.nombre } });
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

  openEditModal(col: Coleccion, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
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
        next: (res) => {
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
        next: (res) => {
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

  deleteColeccion(col: Coleccion, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
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
