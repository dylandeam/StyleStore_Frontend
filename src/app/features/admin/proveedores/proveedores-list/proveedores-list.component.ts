import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedoresService } from '../../../../core/services/proveedores.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { TemporadasService } from '../../../../core/services/temporadas.service';
import { ColeccionService } from '../../../../core/services/coleccion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Proveedor, ProveedorCreate, ProveedorUpdate } from '../../../../core/models/proveedor.model';
import { Categoria } from '../../../../core/models/categoria.model';
import { Temporada } from '../../../../core/models/temporada.model';
import { Coleccion } from '../../../../core/models/coleccion.model';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedores-list.component.html',
  styleUrls: ['./proveedores-list.component.css'],
})
export class ProveedoresListComponent implements OnInit {
  private proveedoresService = inject(ProveedoresService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);
  private coleccionService = inject(ColeccionService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  proveedores = signal<Proveedor[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  colecciones = signal<Coleccion[]>([]);

  isLoading = signal<boolean>(false);
  searchTerm = '';

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingCodigo: string | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: ProveedorCreate = {
    ci: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    categoria_ids: [],
    temporada_ids: [],
    coleccion_ids: [],
  };

  ngOnInit(): void {
    this.loadProveedores();
    this.loadCatalogReferences();
  }

  loadProveedores(): void {
    this.isLoading.set(true);
    this.proveedoresService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadCatalogReferences(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (data) => this.categorias.set(data),
      error: () => {},
    });
    this.temporadasService.getTemporadas().subscribe({
      next: (data) => this.temporadas.set(data),
      error: () => {},
    });
    this.coleccionService.getColecciones().subscribe({
      next: (data) => this.colecciones.set(data),
      error: () => {},
    });
  }

  get filteredProveedores(): Proveedor[] {
    if (!this.searchTerm.trim()) return this.proveedores();
    const term = this.searchTerm.toLowerCase();
    return this.proveedores().filter(
      (p) =>
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        (p.apellido && p.apellido.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.telefono && p.telefono.toLowerCase().includes(term)) ||
        (p.ci && p.ci.toLowerCase().includes(term))
    );
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingCodigo = null;
    this.formData = {
      ci: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      categoria_ids: [],
      temporada_ids: [],
      coleccion_ids: [],
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(p: Proveedor): void {
    this.isEditing.set(true);
    this.editingCodigo = p.codigo;
    this.formData = {
      ci: p.ci || '',
      nombre: p.nombre,
      apellido: p.apellido || '',
      email: p.email || '',
      telefono: p.telefono || '',
      categoria_ids: (p.categorias || []).map((c) => c.id),
      temporada_ids: (p.temporadas || []).map((t) => t.id),
      coleccion_ids: (p.colecciones || []).map((col) => col.id),
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  toggleCategoria(id: number): void {
    const list = this.formData.categoria_ids || [];
    const index = list.indexOf(id);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.formData.categoria_ids = [...list];
  }

  toggleTemporada(id: number): void {
    const list = this.formData.temporada_ids || [];
    const index = list.indexOf(id);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.formData.temporada_ids = [...list];
  }

  toggleColeccion(id: number): void {
    const list = this.formData.coleccion_ids || [];
    const index = list.indexOf(id);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.formData.coleccion_ids = [...list];
  }

  saveProveedor(): void {
    if (!this.formData.nombre.trim()) {
      this.modalError.set('La razón social o nombre de contacto es obligatorio.');
      return;
    }
    if (!this.isEditing() && !this.formData.ci?.trim()) {
      this.modalError.set('La cédula de identidad (CI) es obligatoria.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingCodigo) {
      const updateData: ProveedorUpdate = {
        nombre: this.formData.nombre,
        apellido: this.formData.apellido,
        email: this.formData.email,
        telefono: this.formData.telefono,
        ci: this.formData.ci,
        categoria_ids: this.formData.categoria_ids,
        temporada_ids: this.formData.temporada_ids,
        coleccion_ids: this.formData.coleccion_ids,
      };

      this.proveedoresService.updateProveedor(this.editingCodigo, updateData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Proveedor actualizado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadProveedores();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar proveedor.');
        },
      });
    } else {
      this.proveedoresService.createProveedor(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Proveedor registrado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadProveedores();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al registrar proveedor.');
        },
      });
    }
  }

  deleteProveedor(p: Proveedor): void {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${p.nombre}" (Código: ${p.codigo})?`)) {
      return;
    }

    this.proveedoresService.deleteProveedor(p.codigo).subscribe({
      next: () => {
        this.loadProveedores();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo eliminar el proveedor.');
      },
    });
  }
}
