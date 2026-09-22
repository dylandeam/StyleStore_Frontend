import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromocionesService } from '../../../core/services/promociones.service';
import { Producto, PromocionUpdate } from '../../../core/models/producto.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-promociones-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promociones-list.component.html',
  styleUrls: ['./promociones-list.component.css'],
})
export class PromocionesListComponent implements OnInit {
  private promocionesService = inject(PromocionesService);

  productos = signal<Producto[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  searchTerm: string = '';
  filterEstado: 'todos' | 'promocion' | 'normal' = 'todos';

  // Modal para edición de promoción
  modalVisible = signal<boolean>(false);
  selectedProduct: Producto | null = null;
  saving = signal<boolean>(false);

  // Form de modal
  formEnPromocion: boolean = false;
  formPorcentaje: number = 0;
  formTitulo: string = '';

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.promocionesService.getTodasLasPromociones().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar lista de promociones:', err);
        this.error.set('No se pudieron obtener los productos para gestionar promociones.');
        this.isLoading.set(false);
      },
    });
  }

  get productosFiltrados(): Producto[] {
    let list = [...this.productos()];

    if (this.filterEstado === 'promocion') {
      list = list.filter((p) => p.en_promocion);
    } else if (this.filterEstado === 'normal') {
      list = list.filter((p) => !p.en_promocion);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term) ||
          (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(term))
      );
    }

    return list;
  }

  abrirModalPromocion(p: Producto): void {
    this.selectedProduct = p;
    this.formEnPromocion = p.en_promocion || false;
    this.formPorcentaje = p.porcentaje_descuento || 0;
    this.formTitulo = p.titulo_promocion || '';
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.selectedProduct = null;
  }

  setPorcentajeRapido(pct: number): void {
    this.formPorcentaje = pct;
    if (pct > 0) {
      this.formEnPromocion = true;
    }
  }

  get precioCalculado(): number {
    if (!this.selectedProduct || !this.formEnPromocion || this.formPorcentaje <= 0) {
      return this.selectedProduct?.precio || 0;
    }
    const precioBase = this.selectedProduct.precio;
    const desc = (precioBase * this.formPorcentaje) / 100;
    return Math.round((precioBase - desc) * 100) / 100;
  }

  guardarPromocion(): void {
    if (!this.selectedProduct) return;

    if (this.formEnPromocion && (this.formPorcentaje <= 0 || this.formPorcentaje > 90)) {
      alert('Por favor especifica un porcentaje de descuento válido (1% al 90%).');
      return;
    }

    this.saving.set(true);
    const payload: PromocionUpdate = {
      en_promocion: this.formEnPromocion,
      porcentaje_descuento: this.formEnPromocion ? this.formPorcentaje : 0,
      titulo_promocion: this.formEnPromocion && this.formTitulo.trim() ? this.formTitulo.trim() : null,
    };

    this.promocionesService.updatePromocion(this.selectedProduct.codigo, payload).subscribe({
      next: (updatedProd) => {
        this.saving.set(false);
        this.cerrarModal();
        this.successMsg.set(
          `Promoción para '${updatedProd.nombre}' (${updatedProd.codigo}) actualizada correctamente.`
        );
        setTimeout(() => this.successMsg.set(null), 5000);
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al actualizar promoción:', err);
        alert('Ocurrió un error al actualizar la promoción. Intente de nuevo.');
        this.saving.set(false);
      },
    });
  }

  getImageUrl(fotoPath?: string | null): string {
    if (!fotoPath) return 'assets/images/placeholder-garment.png';
    if (fotoPath.startsWith('http')) return fotoPath;
    const cleanPath = fotoPath.startsWith('/') ? fotoPath.substring(1) : fotoPath;
    return `${environment.apiUrl.replace('/api/v1', '')}/${cleanPath}`;
  }
}
