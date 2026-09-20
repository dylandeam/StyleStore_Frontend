import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OutfitService } from '../../core/services/outfit.service';
import { CarritoService, CatalogoItem } from '../../core/services/carrito.service';
import { UploadService } from '../../core/services/upload.service';
import { OutfitResponse, OutfitCreate, OutfitItemCreate } from '../../core/models/outfit.model';

export type SlotType = 'superior' | 'inferior' | 'calzado' | 'accesorio';

export interface OutfitSlot {
  key: SlotType;
  label: string;
  icon: string;
  prenda: CatalogoItem | null;
}

@Component({
  selector: 'app-outfits',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './outfits.component.html',
  styleUrls: ['./outfits.component.css'],
})
export class OutfitsComponent implements OnInit {
  private outfitService = inject(OutfitService);
  private carritoService = inject(CarritoService);
  public uploadService = inject(UploadService);
  private router = inject(Router);

  activeTab = signal<'probador' | 'mis-outfits'>('probador');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isBuying = signal<boolean>(false);
  message = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Catálogo disponible
  catalogoPrendas = signal<CatalogoItem[]>([]);
  filtroBusquedaModal = signal<string>('');
  slotModalActivo = signal<OutfitSlot | null>(null);

  // Slots del probador en lista para plantilla fuertemente tipada
  slotsList: OutfitSlot[] = [
    { key: 'superior', label: 'Parte Superior', icon: '👕', prenda: null },
    { key: 'inferior', label: 'Parte Inferior', icon: '👖', prenda: null },
    { key: 'calzado', label: 'Calzado', icon: '👟', prenda: null },
    { key: 'accesorio', label: 'Accesorio / Complemento', icon: '👜', prenda: null },
  ];

  nombreNuevoOutfit = '';
  descripcionNuevoOutfit = '';

  // Outfits guardados
  misOutfits = signal<OutfitResponse[]>([]);

  ngOnInit(): void {
    this.cargarCatalogo();
    this.cargarMisOutfits();
  }

  cargarCatalogo(): void {
    this.carritoService.getCatalogo().subscribe({
      next: (items: CatalogoItem[]) => this.catalogoPrendas.set(items),
      error: (err: any) => console.error('Error al cargar catálogo para probador:', err),
    });
  }

  cargarMisOutfits(): void {
    this.isLoading.set(true);
    this.outfitService.getMyOutfits().subscribe({
      next: (data: OutfitResponse[]) => {
        this.misOutfits.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar outfits:', err);
        this.isLoading.set(false);
      },
    });
  }

  abrirSelector(slot: OutfitSlot): void {
    this.slotModalActivo.set(slot);
    this.filtroBusquedaModal.set('');
  }

  cerrarSelector(): void {
    this.slotModalActivo.set(null);
  }

  seleccionarPrendaParaSlot(prenda: CatalogoItem): void {
    const slot = this.slotModalActivo();
    if (slot) {
      slot.prenda = prenda;
      this.cerrarSelector();
    }
  }

  quitarPrendaDeSlot(slot: OutfitSlot): void {
    slot.prenda = null;
  }

  limpiarProbador(): void {
    for (const s of this.slotsList) {
      s.prenda = null;
    }
    this.nombreNuevoOutfit = '';
    this.descripcionNuevoOutfit = '';
  }

  get totalProbador(): number {
    let sum = 0;
    for (const s of this.slotsList) {
      if (s.prenda) {
        sum += Number(s.prenda.precio);
      }
    }
    return sum;
  }

  get cantidadPrendasSeleccionadas(): number {
    return this.slotsList.filter((s) => s.prenda !== null).length;
  }

  get prendasFiltradasParaModal(): CatalogoItem[] {
    const query = this.filtroBusquedaModal().trim().toLowerCase();
    return this.catalogoPrendas().filter((p) => {
      const matchText = (p.nombre + ' ' + (p.categoria_nombre || '')).toLowerCase();
      return query ? matchText.includes(query) : true;
    });
  }

  guardarOutfit(): void {
    if (this.cantidadPrendasSeleccionadas === 0) {
      this.mostrarMensaje('Selecciona al menos una prenda para guardar el outfit.', 'error');
      return;
    }

    if (!this.nombreNuevoOutfit.trim()) {
      this.mostrarMensaje('Ingresa un nombre para tu outfit (ej. "Look Fin de Semana").', 'error');
      return;
    }

    const items: OutfitItemCreate[] = [];
    for (const s of this.slotsList) {
      if (s.prenda) {
        items.push({
          producto_codigo: s.prenda.codigo,
          tipo_prenda: s.key,
          precio: Number(s.prenda.precio),
        });
      }
    }

    const payload: OutfitCreate = {
      nombre: this.nombreNuevoOutfit.trim(),
      descripcion: this.descripcionNuevoOutfit.trim() || undefined,
      items,
    };

    this.isSaving.set(true);
    this.outfitService.createOutfit(payload).subscribe({
      next: (created: OutfitResponse) => {
        this.isSaving.set(false);
        this.mostrarMensaje(`¡Outfit "${created.nombre}" guardado con éxito!`, 'success');
        this.cargarMisOutfits();
        this.activeTab.set('mis-outfits');
        this.limpiarProbador();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.mostrarMensaje('Error al guardar outfit: ' + (err.error?.detail || err.message), 'error');
      },
    });
  }

  comprarOutfitDirecto(outfit: OutfitResponse): void {
    this.isBuying.set(true);
    this.outfitService.buyOutfit(outfit.id).subscribe({
      next: (res) => {
        this.isBuying.set(false);
        let msg = `🛍️ ¡Outfit agregado al carrito!`;
        if (res.items_agregados.length > 0) {
          msg += ` (${res.items_agregados.length} prendas listas)`;
        }
        if (res.items_sin_stock && res.items_sin_stock.length > 0) {
          msg += ` — Sin stock en: ${res.items_sin_stock.join(', ')}`;
        }
        this.mostrarMensaje(msg, 'success');
        this.carritoService.getMyCart().subscribe();
      },
      error: (err: any) => {
        this.isBuying.set(false);
        this.mostrarMensaje('Error al comprar outfit: ' + (err.error?.detail || err.message), 'error');
      },
    });
  }

  eliminarOutfit(outfit: OutfitResponse): void {
    if (!confirm(`¿Eliminar la combinación "${outfit.nombre}"?`)) return;

    this.outfitService.deleteOutfit(outfit.id).subscribe({
      next: () => {
        this.mostrarMensaje('Outfit eliminado correctamente.', 'info');
        this.misOutfits.update((list) => list.filter((o) => o.id !== outfit.id));
      },
      error: (err: any) => {
        this.mostrarMensaje('Error al eliminar: ' + (err.error?.detail || err.message), 'error');
      },
    });
  }

  irAlCarrito(): void {
    this.router.navigate(['/carrito']);
  }

  getImage(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto || '', 'productos');
  }

  private mostrarMensaje(text: string, type: 'success' | 'error' | 'info'): void {
    this.message.set({ text, type });
    setTimeout(() => {
      this.message.set(null);
    }, 5000);
  }
}
