import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
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
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proximamente.component.html',
  styleUrl: './proximamente.component.css',
})
export class ProximamenteComponent implements OnInit {
  private proximamenteService = inject(ProximamenteService);
  private notificacionesService = inject(NotificacionesService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);
  private coleccionService = inject(ColeccionService);
  private uploadService = inject(UploadService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  // Permisos de usuario
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
  isUploadingFoto = signal<boolean>(false);
  fotoPreview = signal<string>('');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Estado interactivo del cliente: Me interesa / Notificar
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
    this.cdr.markForCheck();
    this.proximamenteService.getProximamente().subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage.set('Error al cargar prendas próximas.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });

    this.categoriasService.getCategorias().subscribe({
      next: (cats: Categoria[]) => {
        this.categorias.set(cats);
        this.cdr.markForCheck();
      },
    });
    this.temporadasService.getTemporadas().subscribe({
      next: (temps: Temporada[]) => {
        this.temporadas.set(temps);
        this.cdr.markForCheck();
      },
    });
    this.coleccionService.getColecciones().subscribe({
      next: (cols: Coleccion[]) => {
        this.colecciones.set(cols);
        this.cdr.markForCheck();
      },
    });
  }

  getImagenUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'productos');
  }

  onImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el.src && el.src.includes('logo.jpg')) return;
    el.src = '/assets/images/logo.jpg';
  }

  // Client interactions: Suscribir para recibir alertas
  toggleInterest(itemId: number, event?: Event): void {
    if (event) event.stopPropagation();
    const current = new Set(this.interestedItems());

    if (current.has(itemId)) {
      current.delete(itemId);
      this.interestedItems.set(current);
      this.successMessage.set('Notificación cancelada para este producto.');
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      setTimeout(() => {
        this.successMessage.set(null);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }, 3000);
      return;
    }

    // Llamar al backend para registrar la suscripción
    this.notificacionesService.suscribirProximamente(itemId).subscribe({
      next: (res) => {
        current.add(itemId);
        this.interestedItems.set(current);
        const msg = res?.mensaje || '🔔 ¡Anotado! Te avisaremos cuando la prenda sea marcada como disponible.';
        this.successMessage.set(msg);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 4000);
      },
      error: () => {
        current.add(itemId);
        this.interestedItems.set(current);
        this.successMessage.set('🔔 ¡Anotado! Recibirás la notificación cuando esté disponible.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 3500);
      },
    });
  }

  notificarLlegada(item: Proximamente, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.canManage()) return;
    if (!confirm(`¿Marcar como disponible y notificar la llegada de "${item.nombre}" a todos los clientes suscritos?`)) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.cdr.markForCheck();

    this.proximamenteService.notificarLlegada(item.id).subscribe({
      next: (res) => {
        this.successMessage.set(`📢 ${res.message}`);
        this.isLoading.set(false);
        this.loadData();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 4500);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo enviar la notificación a clientes.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  isInterested(itemId: number): boolean {
    return this.interestedItems().has(itemId);
  }

  openDetailModal(item: Proximamente): void {
    this.detailItem.set(item);
    this.isDetailModalOpen.set(true);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.detailItem.set(null);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Admin management actions
  openCreateModal(): void {
    if (!this.canManage()) return;
    this.isEditing.set(false);
    this.selectedId.set(null);
    this.nombre.set('');
    this.descripcion.set('');
    this.foto.set('');
    this.fotoPreview.set('');
    this.isUploadingFoto.set(false);
    this.fechaEstimada.set('');
    this.categoriaId.set(null);
    this.temporadaId.set(null);
    this.coleccionId.set(null);
    this.active.set(true);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  openEditModal(item: Proximamente, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.canManage()) return;
    this.isEditing.set(true);
    this.selectedId.set(item.id);
    this.nombre.set(item.nombre);
    this.descripcion.set(item.descripcion || '');
    this.foto.set(item.foto || '');
    this.fotoPreview.set(item.foto ? this.getImagenUrl(item.foto) : '');
    this.isUploadingFoto.set(false);
    this.fechaEstimada.set(item.fecha_estimada_llegada || '');
    this.categoriaId.set(item.categoria_id || null);
    this.temporadaId.set(item.temporada_id || null);
    this.coleccionId.set(item.coleccion_id || null);
    this.active.set(item.active);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.fotoPreview.set('');
    this.isUploadingFoto.set(false);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  onFileSelected(event: any): void {
    if (!this.canManage()) return;
    const file = event.target.files?.[0];
    if (file) {
      // Previsualización local inmediata con FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreview.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      this.isUploadingFoto.set(true);
      this.errorMessage.set(null);
      this.cdr.markForCheck();

      this.uploadService.uploadImage(file, 'productos').subscribe({
        next: (res) => {
          this.foto.set(res.url);
          this.fotoPreview.set(this.getImagenUrl(res.url));
          this.isUploadingFoto.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage.set('Error al subir la imagen al servidor.');
          this.isUploadingFoto.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
    }
  }

  removeFoto(): void {
    this.foto.set('');
    this.fotoPreview.set('');
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  onFotoUrlChange(url: string): void {
    this.foto.set(url);
    this.fotoPreview.set(url ? this.getImagenUrl(url) : '');
    this.cdr.markForCheck();
  }

  saveItem(): void {
    if (!this.canManage()) return;
    if (!this.nombre().trim()) {
      this.errorMessage.set('El nombre de la prenda es obligatorio.');
      return;
    }

    if (this.isUploadingFoto()) {
      this.errorMessage.set('Por favor espera a que la imagen termine de subirse.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.cdr.markForCheck();

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
          this.successMessage.set('Prenda próxima actualizada con éxito.');
          this.closeModal();
          this.loadData();
          setTimeout(() => {
            this.successMessage.set(null);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al actualizar.');
          this.isLoading.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
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
          this.successMessage.set('Prenda próxima registrada con éxito.');
          this.closeModal();
          this.loadData();
          setTimeout(() => {
            this.successMessage.set(null);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al registrar.');
          this.isLoading.set(false);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
    }
  }

  deleteItem(item: Proximamente, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.canManage()) return;
    if (!confirm(`¿Eliminar la prenda próxima "${item.nombre}"?`)) return;

    this.isLoading.set(true);
    this.cdr.markForCheck();
    this.proximamenteService.deleteProximamente(item.id).subscribe({
      next: () => {
        this.successMessage.set('Prenda próxima eliminada.');
        this.loadData();
        setTimeout(() => {
          this.successMessage.set(null);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo eliminar.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }
}
