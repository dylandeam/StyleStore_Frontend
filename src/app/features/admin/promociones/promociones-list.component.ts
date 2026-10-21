import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromocionesService, PromocionAgrupada, CodigoDescuento } from '../../../core/services/promociones.service';
import { ProductoService } from '../../../core/services/producto.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { TemporadasService } from '../../../core/services/temporadas.service';
import { Categoria } from '../../../core/models/categoria.model';
import { Temporada } from '../../../core/models/temporada.model';
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
  private productoService = inject(ProductoService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);

  productos = signal<Producto[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  agrupadas = signal<PromocionAgrupada[]>([]);
  codigos = signal<CodigoDescuento[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);

  grupoNombre = '';
  grupoTipo: 'categoria' | 'temporada' = 'categoria';
  grupoObjetivoId: number | null = null;
  grupoPorcentaje = 10;
  grupoInicio = '';
  grupoFin = '';

  codigoNombre = '';
  codigoDescripcion = '';
  codigoPorcentaje = 10;
  codigoOnline = true;
  codigoPresencial = true;
  codigoInicio = '';
  codigoFin = '';
  codigoMaxUsos: number | null = null;

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
    this.cargarReglas();
  }

  cargarReglas(): void {
    this.promocionesService.getAgrupadas().subscribe({ next: (v) => this.agrupadas.set(v), error: (e) => console.warn('Promociones agrupadas todavía no disponibles:', e) });
    this.promocionesService.getCodigos().subscribe({ next: (v) => this.codigos.set(v), error: (e) => console.warn('Códigos todavía no disponibles:', e) });
    this.categoriasService.getCategorias().subscribe({ next: (v) => this.categorias.set(v) });
    this.temporadasService.getTemporadas().subscribe({ next: (v) => this.temporadas.set(v) });
  }

  guardarAgrupada(): void {
    if (!this.grupoNombre.trim() || !this.grupoObjetivoId || this.grupoPorcentaje < 1 || this.grupoPorcentaje > 90) {
      this.error.set('Completa el nombre, objetivo y porcentaje (1 a 90%).'); return;
    }
    const data: any = {
      nombre: this.grupoNombre.trim(), tipo: this.grupoTipo, porcentaje: this.grupoPorcentaje,
      categoria_id: this.grupoTipo === 'categoria' ? Number(this.grupoObjetivoId) : null,
      temporada_id: this.grupoTipo === 'temporada' ? Number(this.grupoObjetivoId) : null,
      fecha_inicio: this.grupoInicio || null, fecha_fin: this.grupoFin || null, active: true,
    };
    this.promocionesService.createAgrupada(data).subscribe({
      next: () => { this.grupoNombre = ''; this.grupoObjetivoId = null; this.successMsg.set('Promoción agrupada creada.'); this.cargarReglas(); },
      error: (e) => this.error.set(e?.error?.detail || 'No se pudo crear la promoción agrupada.'),
    });
  }

  eliminarAgrupada(item: PromocionAgrupada): void {
    if (!confirm(`¿Eliminar la promoción "${item.nombre}"?`)) return;
    this.promocionesService.deleteAgrupada(item.id).subscribe({ next: () => this.cargarReglas(), error: (e) => this.error.set(e?.error?.detail || 'No se pudo eliminar.') });
  }

  guardarCodigo(): void {
    if (!this.codigoNombre.trim() || this.codigoPorcentaje < 1 || this.codigoPorcentaje > 90 || (!this.codigoOnline && !this.codigoPresencial)) {
      this.error.set('Completa el código, porcentaje y habilita al menos un canal.'); return;
    }
    this.promocionesService.createCodigo({
      codigo: this.codigoNombre.trim().toUpperCase(), descripcion: this.codigoDescripcion.trim() || null,
      porcentaje: this.codigoPorcentaje, aplica_online: this.codigoOnline, aplica_presencial: this.codigoPresencial,
      fecha_inicio: this.codigoInicio || null, fecha_fin: this.codigoFin || null, max_usos: this.codigoMaxUsos || null, active: true,
    }).subscribe({
      next: () => { this.codigoNombre = ''; this.codigoDescripcion = ''; this.successMsg.set('Código de descuento creado.'); this.cargarReglas(); },
      error: (e) => this.error.set(e?.error?.detail || 'No se pudo crear el código.'),
    });
  }

  eliminarCodigo(item: CodigoDescuento): void {
    if (!confirm(`¿Eliminar el código "${item.codigo}"?`)) return;
    this.promocionesService.deleteCodigo(item.id).subscribe({ next: () => this.cargarReglas(), error: (e) => this.error.set(e?.error?.detail || 'No se pudo eliminar.') });
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
        console.warn('Invocando fallback a listado general de productos:', err);
        this.productoService.getProductos().subscribe({
          next: (data) => {
            this.productos.set(data);
            this.isLoading.set(false);
          },
          error: (fallbackErr) => {
            console.error('Error al cargar lista de promociones:', fallbackErr);
            this.error.set('No se pudieron obtener los productos para gestionar promociones.');
            this.isLoading.set(false);
          },
        });
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
