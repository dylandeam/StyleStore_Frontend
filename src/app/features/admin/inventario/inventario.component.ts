import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../../core/services/inventario.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  InventarioItem,
  RecomendacionTraspasoStock,
  RecomendacionesTraspasoResponse,
  StockAdjustRequest,
  TraspasoCreateRequest,
  TraspasoInventario,
} from '../../../core/models/inventario.model';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css',
})
export class InventarioComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private sucursalService = inject(SucursalService);
  private uploadService = inject(UploadService);
  private authService = inject(AuthService);

  // States
  vista = signal<'global' | 'sucursal' | 'traspasos'>('global');
  sucursales = signal<Sucursal[]>([]);
  selectedSucursalId = signal<number | null>(null);

  items = signal<InventarioItem[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  traspasos = signal<TraspasoInventario[]>([]);
  recomendaciones = signal<RecomendacionTraspasoStock[]>([]);
  resumenRecomendaciones = signal<RecomendacionesTraspasoResponse | null>(null);
  recomendacionesLoading = signal(false);
  recomendacionesError = signal<string | null>(null);

  // Modal Ajuste de Stock
  isAdjustModalOpen = signal<boolean>(false);
  selectedItem = signal<InventarioItem | null>(null);
  nuevaCantidad = signal<number>(0);
  nuevoPrecio = signal<number | null>(null);
  medidas = signal<Record<string, number | null>>({ pecho: null, cintura: null, cadera: null, largo: null, manga: null });

  // Modal de traspaso
  isTransferModalOpen = signal(false);
  transferItem = signal<InventarioItem | null>(null);
  transferDestinationId = signal<number | null>(null);
  transferQuantity = signal(1);
  transferObservation = signal('');

  canEdit(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  ngOnInit(): void {
    this.loadSucursales();
    this.loadInventario();
    this.loadRecomendaciones();
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales(true).subscribe({
      next: (data) => {
        this.sucursales.set(data);
        if (data.length > 0 && !this.selectedSucursalId()) {
          this.selectedSucursalId.set(data[0].id);
        }
      },
      error: () => {},
    });
  }

  loadInventario(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.vista() === 'traspasos') {
      this.loadTraspasos();
      return;
    }

    if (this.vista() === 'global') {
      this.inventarioService.getInventarioGlobal({ search: this.searchTerm().trim() || undefined }).subscribe({
        next: (data) => {
          this.items.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al cargar el inventario global.');
          this.isLoading.set(false);
        },
      });
    } else {
      const sucId = this.selectedSucursalId();
      if (!sucId) {
        this.items.set([]);
        this.isLoading.set(false);
        return;
      }
      this.inventarioService.getInventarioSucursal(sucId).subscribe({
        next: (data) => {
          let list = data;
          if (this.searchTerm().trim()) {
            const term = this.searchTerm().toLowerCase().trim();
            list = list.filter(
              (i) =>
                (i.producto_nombre && i.producto_nombre.toLowerCase().includes(term)) ||
                (i.producto_codigo && i.producto_codigo.toLowerCase().includes(term)) ||
                (i.color && i.color.toLowerCase().includes(term)) ||
                (i.talla && i.talla.toLowerCase().includes(term))
            );
          }
          this.items.set(list);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al cargar inventario por sucursal.');
          this.isLoading.set(false);
        },
      });
    }
  }

  setVista(v: 'global' | 'sucursal' | 'traspasos'): void {
    this.vista.set(v);
    this.loadInventario();
    if (v !== 'traspasos') this.loadRecomendaciones();
  }

  loadRecomendaciones(): void {
    this.recomendacionesLoading.set(true);
    this.recomendacionesError.set(null);
    const branchId = this.vista() === 'sucursal' ? this.selectedSucursalId() : null;
    this.inventarioService.getRecomendacionesTraspaso(branchId).subscribe({
      next: (response) => {
        this.resumenRecomendaciones.set(response);
        this.recomendaciones.set(response.items);
        this.recomendacionesLoading.set(false);
      },
      error: (err) => {
        this.resumenRecomendaciones.set(null);
        this.recomendaciones.set([]);
        this.recomendacionesError.set(
          err.status === 403
            ? 'Las recomendaciones predictivas requieren un plan con analítica avanzada.'
            : (err.error?.detail || 'No fue posible analizar la redistribución de stock.')
        );
        this.recomendacionesLoading.set(false);
      },
    });
  }

  aplicarRecomendacion(recommendation: RecomendacionTraspasoStock): void {
    this.transferItem.set({
      stock_inventario_id: 0,
      producto_codigo: recommendation.codigo,
      producto_nombre: recommendation.producto,
      producto_color_id: recommendation.producto_color_id,
      color: recommendation.color,
      talla_id: recommendation.talla_id,
      talla: recommendation.talla,
      sucursal_id: recommendation.sucursal_origen_id,
      sucursal: recommendation.sucursal_origen,
      cantidad: recommendation.stock_origen_efectivo,
      cantidad_disponible: recommendation.stock_origen_efectivo,
    });
    this.transferDestinationId.set(recommendation.sucursal_destino_id);
    this.transferQuantity.set(recommendation.cantidad_recomendada);
    this.transferObservation.set(
      `Recomendación IA (${recommendation.confianza_porcentaje}%): ${recommendation.explicacion}`.slice(0, 500)
    );
    this.isTransferModalOpen.set(true);
  }

  loadTraspasos(): void {
    this.isLoading.set(true);
    this.inventarioService.getTraspasos().subscribe({
      next: (data) => {
        this.traspasos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al cargar los traspasos.');
        this.isLoading.set(false);
      },
    });
  }

  openTransferModal(item: InventarioItem): void {
    const candidates = this.sucursales().filter((branch) => branch.id !== item.sucursal_id);
    if (!item.producto_color_id || !item.talla_id || !item.sucursal_id || candidates.length === 0) {
      this.errorMessage.set('Se requiere otra sucursal activa y una variante completa para realizar el traspaso.');
      return;
    }
    this.transferItem.set(item);
    this.transferDestinationId.set(candidates[0].id);
    this.transferQuantity.set(1);
    this.transferObservation.set('');
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
    this.transferItem.set(null);
  }

  crearTraspaso(): void {
    const item = this.transferItem();
    const destination = this.transferDestinationId();
    if (!item?.sucursal_id || !item.producto_color_id || !item.talla_id || !destination) return;
    if (this.transferQuantity() < 1 || this.transferQuantity() > item.cantidad) {
      this.errorMessage.set(`La cantidad debe estar entre 1 y ${item.cantidad}.`);
      return;
    }
    const request: TraspasoCreateRequest = {
      sucursal_origen_id: item.sucursal_id,
      sucursal_destino_id: destination,
      producto_color_id: item.producto_color_id,
      talla_id: item.talla_id,
      cantidad: this.transferQuantity(),
      idempotency_key: this.newIdempotencyKey(),
      observacion: this.transferObservation().trim() || undefined,
    };
    this.isLoading.set(true);
    this.inventarioService.crearTraspaso(request).subscribe({
      next: () => {
        this.successMessage.set('Traspaso solicitado; queda pendiente de aprobación.');
        this.closeTransferModal();
        this.loadRecomendaciones();
        this.setVista('traspasos');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo solicitar el traspaso.');
        this.isLoading.set(false);
      },
    });
  }

  decidirTraspaso(item: TraspasoInventario, accion: 'aprobar' | 'rechazar' | 'cancelar'): void {
    if (!confirm(`¿Deseas ${accion} el traspaso #${item.id}?`)) return;
    this.isLoading.set(true);
    this.inventarioService.decidirTraspaso(item.id, accion).subscribe({
      next: () => {
        this.successMessage.set(`Traspaso ${accion === 'aprobar' ? 'aprobado' : accion === 'rechazar' ? 'rechazado' : 'cancelado'} correctamente.`);
        this.loadTraspasos();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo procesar el traspaso.');
        this.isLoading.set(false);
      },
    });
  }

  private newIdempotencyKey(): string {
    return globalThis.crypto?.randomUUID?.() ?? `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  onSucursalChange(id: number): void {
    this.selectedSucursalId.set(Number(id));
    this.loadInventario();
    this.loadRecomendaciones();
  }

  onSearch(): void {
    this.loadInventario();
  }

  openAdjustModal(item: InventarioItem): void {
    this.selectedItem.set(item);
    this.nuevaCantidad.set(item.cantidad);
    this.nuevoPrecio.set(item.precio_variante ?? item.precio ?? null);
    this.medidas.set({
      pecho: item.medidas?.['pecho'] ?? null,
      cintura: item.medidas?.['cintura'] ?? null,
      cadera: item.medidas?.['cadera'] ?? null,
      largo: item.medidas?.['largo'] ?? null,
      manga: item.medidas?.['manga'] ?? null,
    });
    this.errorMessage.set(null);
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen.set(false);
    this.selectedItem.set(null);
  }

  guardarAjuste(): void {
    const item = this.selectedItem();
    if (!item) return;

    if (this.nuevaCantidad() < 0) {
      this.errorMessage.set('La cantidad no puede ser negativa.');
      return;
    }

    this.isLoading.set(true);
    const req: StockAdjustRequest = {
      stock_inventario_id: item.stock_inventario_id,
      cantidad: this.nuevaCantidad(),
      precio_variante: this.nuevoPrecio(),
      medidas: Object.fromEntries(
        Object.entries(this.medidas()).filter(([, value]) => value !== null && Number(value) > 0)
      ) as Record<string, number>,
    };

    this.inventarioService.ajustarStock(req).subscribe({
      next: () => {
        this.successMessage.set('Stock actualizado exitosamente.');
        this.closeAdjustModal();
        this.loadInventario();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al ajustar existencias.');
        this.isLoading.set(false);
      },
    });
  }

  getImagenUrl(foto?: string): string {
    return this.uploadService.getImageUrl(foto, 'productos');
  }

  setMedida(key: string, value: string | number): void {
    const parsed = value === '' || value === null ? null : Number(value);
    this.medidas.update((current) => ({ ...current, [key]: parsed }));
  }
}
