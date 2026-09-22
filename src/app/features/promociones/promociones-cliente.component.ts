import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PromocionesService } from '../../core/services/promociones.service';
import { Producto } from '../../core/models/producto.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-promociones-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promociones-cliente.component.html',
  styleUrls: ['./promociones-cliente.component.css'],
})
export class PromocionesClienteComponent implements OnInit {
  private promocionesService = inject(PromocionesService);
  private router = inject(Router);

  promociones = signal<Producto[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchTerm: string = '';
  selectedSort: string = 'descuento_desc';

  ngOnInit(): void {
    this.cargarPromociones();
  }

  cargarPromociones(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.promocionesService.getPromocionesActivas().subscribe({
      next: (data) => {
        this.promociones.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ofertas y promociones:', err);
        this.error.set('No se pudieron cargar las promociones vigentes. Por favor reintente.');
        this.isLoading.set(false);
      },
    });
  }

  get promocionesFiltradas(): Producto[] {
    let result = [...this.promociones()];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(term)) ||
          p.codigo.toLowerCase().includes(term) ||
          (p.titulo_promocion && p.titulo_promocion.toLowerCase().includes(term))
      );
    }

    if (this.selectedSort === 'descuento_desc') {
      result.sort((a, b) => (b.porcentaje_descuento || 0) - (a.porcentaje_descuento || 0));
    } else if (this.selectedSort === 'precio_asc') {
      result.sort((a, b) => (a.precio_descuento || a.precio) - (b.precio_descuento || b.precio));
    } else if (this.selectedSort === 'precio_desc') {
      result.sort((a, b) => (b.precio_descuento || b.precio) - (a.precio_descuento || a.precio));
    }

    return result;
  }

  getImageUrl(fotoPath?: string | null): string {
    if (!fotoPath) return 'assets/images/placeholder-garment.png';
    if (fotoPath.startsWith('http')) return fotoPath;
    const cleanPath = fotoPath.startsWith('/') ? fotoPath.substring(1) : fotoPath;
    return `${environment.apiUrl.replace('/api/v1', '')}/${cleanPath}`;
  }

  verDetalle(codigo: string): void {
    this.router.navigate(['/catalogo', codigo]);
  }
}
