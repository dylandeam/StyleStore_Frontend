import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProximamenteService } from '../../../core/services/proximamente.service';
import { Proximamente, ProximamenteCreate, ProximamenteUpdate } from '../../../core/models/proximamente.model';
import { CategoriasService } from '../../../core/services/categorias.service';
import { TemporadasService } from '../../../core/services/temporadas.service';
import { ColeccionService } from '../../../core/services/coleccion.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { Categoria } from '../../../core/models/categoria.model';
import { Temporada } from '../../../core/models/temporada.model';
import { Coleccion } from '../../../core/models/coleccion.model';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proximamente.component.html',
  styleUrl: './proximamente.component.css',
})
export class ProximamenteComponent implements OnInit {
  private proximamenteService = inject(ProximamenteService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);
  private coleccionService = inject(ColeccionService);
  private uploadService = inject(UploadService);
  private authService = inject(AuthService);

  // User permissions
  currentUser = this.authService.currentUser;
  canManage = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  });

  items = signal<Proximamente[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  colecciones = signal<Coleccion[]>([]);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Client interactive state: Me interesa / Notificar
  interestedItems = signal<Set<number>>(new Set<number>());
  detailItem = signal<Proximamente | null>(null);
  isDetailModalOpen = signal<boolean>(false);

  // Modal Crear / Editar (solo administradores / encargados)
  isModalOpen = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedId = signal<number | null>(null);

  nombre = signal<string>('');
  descripcion = signal<string>('');
  foto = signal<string>('');
  fechaEstimada = signal<string>('');
  categoriaId = signal<number | null>(null);
  temporadaId = signal<number | null>(null);
  coleccionId = signal<number | null>(null);
  active = signal<boolean>(true);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.proximamenteService.getProximamente().subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar prendas próximas.');
        this.isLoading.set(false);
      },
    });

    this.categoriasService.getCategorias().subscribe({
      next: (cats: Categoria[]) => this.categorias.set(cats),
    });
    this.temporadasService.getTemporadas().subscribe({
      next: (temps: Temporada[]) => this.temporadas.set(temps),
    });
    this.coleccionService.getColecciones().subscribe({
      next: (cols: Coleccion[]) => this.colecciones.set(cols),
    });
  }

  getImagenUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'productos');
  }

  onImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    el.src = '/assets/images/logo.jpg';
  }

  // Client interactions
  toggleInterest(itemId: number, event?: Event): void {
    if (event) event.stopPropagation();
    const current = new Set(this.interestedItems());
    if (current.has(itemId)) {
      current.delete(itemId);
      this.successMessage.set('Notificación cancelada.');
    } else {
      current.add(itemId);
      this.successMessage.set('🔔 ¡Anotado! Te avisaremos tan pronto esta prenda llegue a tienda.');
    }
    this.interestedItems.set(current);
    setTimeout(() => this.successMessage.set(null), 3500);
  }

  isInterested(itemId: number): boolean {
    return this.interestedItems().has(itemId);
  }

  openDetailModal(item: Proximamente): void {
    this.detailItem.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.detailItem.set(null);
  }

  // Admin management actions
  openCreateModal(): void {
    if (!this.canManage()) return;
    this.isEditing.set(false);
    this.selectedId.set(null);
    this.nombre.set('');
    this.descripcion.set('');
    this.foto.set('');
    this.fechaEstimada.set('');
    this.categoriaId.set(null);
    this.temporadaId.set(null);
    this.coleccionId.set(null);
    this.active.set(true);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: Proximamente, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.canManage()) return;
    this.isEditing.set(true);
    this.selectedId.set(item.id);
    this.nombre.set(item.nombre);
    this.descripcion.set(item.descripcion || '');
    this.foto.set(item.foto || '');
    this.fechaEstimada.set(item.fecha_estimada_llegada || '');
    this.categoriaId.set(item.categoria_id || null);
    this.temporadaId.set(item.temporada_id || null);
    this.coleccionId.set(item.coleccion_id || null);
    this.active.set(item.active);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onFileSelected(event: any): void {
    if (!this.canManage()) return;
    const file = event.target.files[0];
    if (file) {
      this.uploadService.uploadImage(file, 'productos').subscribe({
        next: (res) => {
          this.foto.set(res.url);
        },
        error: () => {
          this.errorMessage.set('Error al subir la imagen.');
        },
      });
    }
  }

  saveItem(): void {
    if (!this.canManage()) return;
    if (!this.nombre().trim()) {
      this.errorMessage.set('El nombre de la prenda es obligatorio.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.selectedId()) {
      const updateData: ProximamenteUpdate = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        foto: this.foto().trim() || undefined,
        fecha_estimada_llegada: this.fechaEstimada() || undefined,
        categoria_id: this.categoriaId() || undefined,
        temporada_id: this.temporadaId() || undefined,
        coleccion_id: this.coleccionId() || undefined,
        active: this.active(),
      };
      this.proximamenteService.updateProximamente(this.selectedId()!, updateData).subscribe({
        next: () => {
          this.successMessage.set('Prenda próxima actualizada.');
          this.closeModal();
          this.loadData();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al actualizar.');
          this.isLoading.set(false);
        },
      });
    } else {
      const createData: ProximamenteCreate = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        foto: this.foto().trim() || undefined,
        fecha_estimada_llegada: this.fechaEstimada() || undefined,
        categoria_id: this.categoriaId() || undefined,
        temporada_id: this.temporadaId() || undefined,
        coleccion_id: this.coleccionId() || undefined,
      };
      this.proximamenteService.createProximamente(createData).subscribe({
        next: () => {
          this.successMessage.set('Prenda próxima registrada.');
          this.closeModal();
          this.loadData();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al registrar.');
          this.isLoading.set(false);
        },
      });
    }
  }

  deleteItem(item: Proximamente, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.canManage()) return;
    if (!confirm(`¿Eliminar la prenda próxima "${item.nombre}"?`)) return;

    this.isLoading.set(true);
    this.proximamenteService.deleteProximamente(item.id).subscribe({
      next: () => {
        this.successMessage.set('Prenda próxima eliminada.');
        this.loadData();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo eliminar.');
        this.isLoading.set(false);
      },
    });
  }
}
