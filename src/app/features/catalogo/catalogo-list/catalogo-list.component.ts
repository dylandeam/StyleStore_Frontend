import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService, CatalogoItem } from '../../../core/services/carrito.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { TemporadasService } from '../../../core/services/temporadas.service';
import { ColeccionService } from '../../../core/services/coleccion.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { BranchSelectionService } from '../../../core/services/branch-selection.service';
import { UploadService } from '../../../core/services/upload.service';
import { Categoria } from '../../../core/models/categoria.model';
import { Temporada } from '../../../core/models/temporada.model';
import { Coleccion } from '../../../core/models/coleccion.model';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-catalogo-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './catalogo-list.component.html',
  styleUrls: ['./catalogo-list.component.css'],
})
export class CatalogoListComponent implements OnInit {
  private router = inject(Router);
  private carritoService = inject(CarritoService);
  private categoriasService = inject(CategoriasService);
  private temporadasService = inject(TemporadasService);
  private coleccionService = inject(ColeccionService);
  private sucursalService = inject(SucursalService);
  public branchService = inject(BranchSelectionService);
  public uploadService = inject(UploadService);

  productos = signal<CatalogoItem[]>([]);
  recomendadosParaTi = signal<any[]>([]);
  loadingParaTi = signal<boolean>(true);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  colecciones = signal<Coleccion[]>([]);
  sucursales = signal<Sucursal[]>([]);

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filtros
  searchTerm = '';
  selectedCategoriaId: number | null = null;
  selectedTemporadaId: number | null = null;
  selectedColeccionId: number | null = null;

  ngOnInit(): void {
    this.cargarFiltros();
    this.cargarParaTi();
    this.cargarCatalogo();
  }

  cargarParaTi(): void {
    this.loadingParaTi.set(true);
    this.carritoService.getParaTiIA(6).subscribe({
      next: (data) => {
        this.recomendadosParaTi.set(data || []);
        this.loadingParaTi.set(false);
      },
      error: () => {
        this.loadingParaTi.set(false);
      },
    });
  }

  verDetalle(codigo: string): void {
    if (!codigo) return;
    this.router.navigate(['/catalogo/producto', codigo]);
  }

  cargarFiltros(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (data) => this.categorias.set(data),
    });
    this.temporadasService.getTemporadas().subscribe({
      next: (data) => this.temporadas.set(data),
    });
    this.coleccionService.getColecciones().subscribe({
      next: (data) => this.colecciones.set(data),
    });
    this.sucursalService.getSucursales(true).subscribe({
      next: (data) => this.sucursales.set(data),
    });
  }

  cargarCatalogo(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const sucursalId = this.branchService.selectedBranchId();

    this.carritoService.getCatalogo({
      categoria_id: this.selectedCategoriaId ?? undefined,
      temporada_id: this.selectedTemporadaId ?? undefined,
      coleccion_id: this.selectedColeccionId ?? undefined,
      sucursal_id: sucursalId ?? undefined,
      search: this.searchTerm ? this.searchTerm.trim() : undefined,
    }).subscribe({
      next: (data) => {
        this.productos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar el catálogo de prendas. Intenta nuevamente.');
        this.isLoading.set(false);
      },
    });
  }

  onBranchChange(event: any): void {
    const val = event.target.value;
    const branchId: number | 'all' = val === 'all' || val === '' ? 'all' : Number(val);
    this.branchService.setBranch(branchId, this.sucursales());
    this.cargarCatalogo();
  }

  onFilterChange(): void {
    this.cargarCatalogo();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedCategoriaId = null;
    this.selectedTemporadaId = null;
    this.selectedColeccionId = null;
    this.cargarCatalogo();
  }

  get productosFiltrados(): CatalogoItem[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.productos();
    return this.productos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(term))
    );
  }

  getImageUrl(fotoPath: string | null | undefined): string {
    return this.uploadService.getFileUrl(fotoPath);
  }
}
