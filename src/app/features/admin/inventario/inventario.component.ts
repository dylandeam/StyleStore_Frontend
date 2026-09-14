import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../../core/services/inventario.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { UploadService } from '../../../core/services/upload.service';
import { InventarioItem, StockAdjustRequest } from '../../../core/models/inventario.model';
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

  // States
  vista = signal<'global' | 'sucursal'>('global');
  sucursales = signal<Sucursal[]>([]);
  selectedSucursalId = signal<number | null>(null);

  items = signal<InventarioItem[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modal Ajuste de Stock
  isAdjustModalOpen = signal<boolean>(false);
  selectedItem = signal<InventarioItem | null>(null);
  nuevaCantidad = signal<number>(0);

  ngOnInit(): void {
    this.loadSucursales();
    this.loadInventario();
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

  setVista(v: 'global' | 'sucursal'): void {
    this.vista.set(v);
    this.loadInventario();
  }

  onSucursalChange(id: number): void {
    this.selectedSucursalId.set(Number(id));
    this.loadInventario();
  }

  onSearch(): void {
    this.loadInventario();
  }

  openAdjustModal(item: InventarioItem): void {
    this.selectedItem.set(item);
    this.nuevaCantidad.set(item.cantidad);
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
}

