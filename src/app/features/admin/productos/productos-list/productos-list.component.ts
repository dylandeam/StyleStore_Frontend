import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../../../core/services/producto.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { TemporadasService } from '../../../../core/services/temporadas.service';
import { ColoresService } from '../../../../core/services/colores.service';
import { TallasService } from '../../../../core/services/tallas.service';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { StockService } from '../../../../core/services/stock.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UploadService } from '../../../../core/services/upload.service';
import { Producto, ProductoCreate, ProductoUpdate } from '../../../../core/models/producto.model';
import { Categoria } from '../../../../core/models/categoria.model';
import { Temporada } from '../../../../core/models/temporada.model';
import { Color } from '../../../../core/models/color.model';
import { Talla } from '../../../../core/models/talla.model';
import { Sucursal } from '../../../../core/models/sucursal.model';
import { StockInventarioItem } from '../../../../core/models/stock.model';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos-list.component.html',
  styleUrls: ['./productos-list.component.css'],
})
export class ProductosListComponent implements OnInit {
  private productoService = inject(ProductoService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);
  private coloresService = inject(ColoresService);
  private tallasService = inject(TallasService);
  private sucursalService = inject(SucursalService);
  private stockService = inject(StockService);
  private authService = inject(AuthService);
  private uploadService = inject(UploadService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  colores = signal<Color[]>([]);
  tallas = signal<Talla[]>([]);
  sucursales = signal<Sucursal[]>([]);

  isLoading = signal<boolean>(false);
  searchTerm = '';
  selectedCategoriaFilter: number | '' = '';
  selectedTemporadaFilter: number | '' = '';
  selectedColorFilter: number | '' = '';

  get filteredProductos(): Producto[] {
    let list = this.productos();
    if (this.selectedColorFilter !== '') {
      const colId = Number(this.selectedColorFilter);
      list = list.filter((p) => p.colores?.some((c) => c.id === colId));
    }
    return list;
  }

  // Modal Producto (Crear / Editar)
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingCodigo: string | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');
  isUploadingFoto = signal<boolean>(false);
  fotoPreview = signal<string>('');

  formData: ProductoCreate = {
    codigo: '',
    nombre: '',
    descripcion: '',
    foto: '',
    precio: 0,
    categoria_id: 0,
    temporada_id: 0,
    color_ids: [],
    active: true,
  };

  // Modal Gestión de Stock
  showStockModal = signal<boolean>(false);
  selectedProductForStock: Producto | null = null;
  stockItems = signal<StockInventarioItem[]>([]);
  isLoadingStock = signal<boolean>(false);
  isSubmittingStock = signal<boolean>(false);
  stockModalError = signal<string>('');
  stockModalSuccess = signal<string>('');

  // Form para agregar nuevo registro de stock
  newStockColorId = 0;
  newStockTallaId = 0;
  newStockSucursalId = 0;
  newStockCantidad = 0;

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadProductos();
  }

  loadCatalogos(): void {
    this.categoriasService.getCategorias().subscribe((data) => this.categorias.set(data));
    this.temporadasService.getTemporadas().subscribe((data) => this.temporadas.set(data));
    this.coloresService.getColores().subscribe((data) => this.colores.set(data));
    this.tallasService.getTallas().subscribe((data) => this.tallas.set(data));
    this.sucursalService.getSucursales().subscribe((data) => this.sucursales.set(data));
  }

  loadProductos(): void {
    this.isLoading.set(true);
    const filters: any = {};
    if (this.searchTerm.trim()) filters.search = this.searchTerm.trim();
    if (this.selectedCategoriaFilter !== '') filters.categoria_id = Number(this.selectedCategoriaFilter);
    if (this.selectedTemporadaFilter !== '') filters.temporada_id = Number(this.selectedTemporadaFilter);

    this.productoService.getProductos(filters).subscribe({
      next: (data) => {
        this.productos.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.loadProductos();
  }

  isColorSelected(colorId: number): boolean {
    return (this.formData.color_ids || []).includes(colorId);
  }

  toggleColor(colorId: number): void {
    const list = this.formData.color_ids ? [...this.formData.color_ids] : [];
    const idx = list.indexOf(colorId);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(colorId);
    }
    this.formData.color_ids = list;
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingCodigo = null;
    this.fotoPreview.set('');
    const firstCat = this.categorias().length > 0 ? this.categorias()[0].id : 0;
    const firstTemp = this.temporadas().length > 0 ? this.temporadas()[0].id : 0;

    this.formData = {
      codigo: '',
      nombre: '',
      descripcion: '',
      foto: '',
      precio: 0,
      categoria_id: firstCat,
      temporada_id: firstTemp,
      color_ids: [],
      active: true,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(p: Producto): void {
    this.isEditing.set(true);
    this.editingCodigo = p.codigo;
    this.fotoPreview.set(p.foto ? this.uploadService.getImageUrl(p.foto) : '');
    this.formData = {
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      foto: p.foto || '',
      precio: p.precio,
      categoria_id: p.categoria_id,
      temporada_id: p.temporada_id,
      color_ids: p.colores ? p.colores.map((c) => c.id) : [],
      active: p.active,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
    this.fotoPreview.set('');
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.modalError.set('Formato no permitido. Solo se admiten imágenes PNG, JPG o WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.modalError.set('El tamaño de la imagen no debe superar los 5 MB.');
      return;
    }

    // Previsualización local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      this.fotoPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subida al backend
    this.isUploadingFoto.set(true);
    this.modalError.set('');
    this.uploadService.uploadImage(file, 'productos').subscribe({
      next: (res) => {
        this.formData.foto = res.url;
        this.fotoPreview.set(this.uploadService.getImageUrl(res.url));
        this.isUploadingFoto.set(false);
      },
      error: (err) => {
        this.isUploadingFoto.set(false);
        const detail = err.error?.detail || 'Error al subir la imagen del producto.';
        this.modalError.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
      },
    });
  }

  removeFoto(): void {
    this.formData.foto = '';
    this.fotoPreview.set('');
  }

  getImageUrl(url?: string | null): string {
    return this.uploadService.getImageUrl(url);
  }

  submitProducto(): void {
    if (!this.formData.nombre.trim() || !this.formData.categoria_id || !this.formData.temporada_id || this.formData.precio <= 0) {
      this.modalError.set('Nombre, Categoría, Temporada y Precio (> 0) son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingCodigo) {
      const updateData: ProductoUpdate = {
        nombre: this.formData.nombre,
        descripcion: this.formData.descripcion,
        foto: this.formData.foto,
        precio: this.formData.precio,
        categoria_id: this.formData.categoria_id,
        temporada_id: this.formData.temporada_id,
        color_ids: this.formData.color_ids,
        active: this.formData.active,
      };

      this.productoService.updateProducto(this.editingCodigo, updateData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Producto actualizado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadProductos();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar producto.');
        },
      });
    } else {
      this.productoService.createProducto(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Producto registrado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadProductos();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al registrar producto.');
        },
      });
    }
  }

  deleteProducto(p: Producto): void {
    if (!confirm(`¿Está seguro de eliminar el producto "${p.nombre}" (${p.codigo})?`)) {
      return;
    }

    this.productoService.deleteProducto(p.codigo).subscribe({
      next: () => {
        this.loadProductos();
      },
      error: (err) => {
        alert(err.error?.detail || 'Error al eliminar producto.');
      },
    });
  }

  // --- Manejo de Stock e Inventario por Sucursal ---
  openStockModal(p: Producto): void {
    this.selectedProductForStock = p;
    this.stockModalError.set('');
    this.stockModalSuccess.set('');
    this.showStockModal.set(true);
    this.loadProductStock(p.codigo);

    if (this.sucursales().length > 0) this.newStockSucursalId = this.sucursales()[0].id;
    if (this.tallas().length > 0) this.newStockTallaId = this.tallas()[0].id;
    if (p.colores && p.colores.length > 0) {
      this.newStockColorId = p.colores[0].id;
    } else if (this.colores().length > 0) {
      this.newStockColorId = this.colores()[0].id;
    }
    this.newStockCantidad = 0;
  }

  closeStockModal(): void {
    this.showStockModal.set(false);
    this.selectedProductForStock = null;
    this.loadProductos();
  }

  loadProductStock(codigo: string): void {
    this.isLoadingStock.set(true);
    this.stockService.getProductStock(codigo).subscribe({
      next: (items) => {
        this.stockItems.set(items);
        this.isLoadingStock.set(false);
      },
      error: () => {
        this.isLoadingStock.set(false);
      },
    });
  }

  updateSingleStock(item: StockInventarioItem, newCantidad: number): void {
    if (!this.selectedProductForStock || newCantidad < 0) return;
    item.cantidad = newCantidad;
    this.stockModalError.set('');
    this.stockModalSuccess.set('');

    this.stockService
      .updateProductStock(this.selectedProductForStock.codigo, {
        items: [
          {
            producto_color_id: item.producto_color_id,
            talla_id: item.talla_id,
            sucursal_id: item.sucursal_id,
            cantidad: newCantidad,
          },
        ],
      })
      .subscribe({
        next: () => {
          this.stockModalSuccess.set('Stock actualizado.');
          setTimeout(() => this.stockModalSuccess.set(''), 1500);
        },
        error: (err) => {
          this.stockModalError.set(err.error?.detail || 'Error al actualizar inventario.');
        },
      });
  }

  addOrUpdateStockRow(): void {
    if (!this.selectedProductForStock) return;
    if (!this.newStockColorId || !this.newStockTallaId || !this.newStockSucursalId) {
      this.stockModalError.set('Seleccione color, talla y sucursal.');
      return;
    }
    if (this.newStockCantidad < 0) {
      this.stockModalError.set('La cantidad no puede ser negativa.');
      return;
    }

    this.isSubmittingStock.set(true);
    this.stockModalError.set('');

    this.stockService
      .updateProductStock(this.selectedProductForStock.codigo, {
        items: [
          {
            producto_color_id: this.newStockColorId,
            talla_id: this.newStockTallaId,
            sucursal_id: this.newStockSucursalId,
            cantidad: this.newStockCantidad,
          },
        ],
      })
      .subscribe({
        next: () => {
          this.isSubmittingStock.set(false);
          this.stockModalSuccess.set('Inventario guardado con éxito.');
          this.loadProductStock(this.selectedProductForStock!.codigo);
          setTimeout(() => this.stockModalSuccess.set(''), 2000);
        },
        error: (err) => {
          this.isSubmittingStock.set(false);
          this.stockModalError.set(err.error?.detail || 'Error al guardar inventario.');
        },
      });
  }
}
