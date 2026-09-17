import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService, CatalogoItem } from '../../../core/services/carrito.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './producto-detalle.component.html',
  styleUrls: ['./producto-detalle.component.css'],
})
export class ProductoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carritoService = inject(CarritoService);
  private uploadService = inject(UploadService);

  codigo: string = '';
  producto: CatalogoItem | null = null;
  recomendaciones: any[] = [];
  loading: boolean = true;
  loadingRecomendaciones: boolean = true;
  error: string | null = null;

  // Selección de variantes
  varianteColorSeleccionada: any = null;
  existenciaSeleccionada: any = null;
  cantidad: number = 1;
  agregando: boolean = false;
  mensajeToast: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const cod = params.get('codigo');
      if (cod) {
        this.codigo = cod;
        this.cargarProducto(cod);
      }
    });
  }

  cargarProducto(codigo: string): void {
    this.loading = true;
    this.error = null;
    this.producto = null;

    this.carritoService.getProductoDetalle(codigo).subscribe({
      next: (data) => {
        this.producto = data;
        this.loading = false;

        // Seleccionar primer color y primera talla por defecto
        if (data.variantes && data.variantes.length > 0) {
          this.seleccionarColor(data.variantes[0]);
        }

        // Cargar recomendaciones de IA local
        this.cargarRecomendaciones(codigo);
      },
      error: (err) => {
        this.error = 'No se pudo cargar la información del producto.';
        this.loading = false;
      },
    });
  }

  cargarRecomendaciones(codigo: string): void {
    this.loadingRecomendaciones = true;
    this.carritoService.getRecomendadosIA(codigo, 4).subscribe({
      next: (recs) => {
        this.recomendaciones = recs;
        this.loadingRecomendaciones = false;
      },
      error: () => {
        this.loadingRecomendaciones = false;
      },
    });
  }

  seleccionarColor(variante: any): void {
    this.varianteColorSeleccionada = variante;
    // Seleccionar automáticamente la primera talla disponible con stock
    if (variante.existencias && variante.existencias.length > 0) {
      const conStock = variante.existencias.find((e: any) => e.cantidad > 0);
      this.existenciaSeleccionada = conStock || variante.existencias[0];
    } else {
      this.existenciaSeleccionada = null;
    }
    this.cantidad = 1;
  }

  seleccionarTalla(existencia: any): void {
    this.existenciaSeleccionada = existencia;
    this.cantidad = 1;
  }

  incrementar(): void {
    const maxStock = this.existenciaSeleccionada?.cantidad || 1;
    if (this.cantidad < maxStock) {
      this.cantidad++;
    }
  }

  decrementar(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  getImageUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'productos') || 'assets/images/placeholder.jpg';
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    setTimeout(() => {
      this.mensajeToast = null;
    }, 3500);
  }

  agregarAlCarrito(redirigirAlCheckout: boolean = false): void {
    if (!this.existenciaSeleccionada) {
      this.mostrarToast('Por favor selecciona un color y talla disponible.');
      return;
    }

    if (this.existenciaSeleccionada.cantidad <= 0) {
      this.mostrarToast('No hay existencias disponibles para esta variante.');
      return;
    }

    this.agregando = true;
    this.carritoService.addItem(this.existenciaSeleccionada.stock_inventario_id, this.cantidad).subscribe({
      next: () => {
        this.agregando = false;
        if (redirigirAlCheckout) {
          this.router.navigate(['/carrito']);
        } else {
          this.mostrarToast(`¡${this.producto?.nombre} añadido al carrito!`);
        }
      },
      error: (err) => {
        this.agregando = false;
        this.mostrarToast('Error al agregar el producto al carrito.');
      },
    });
  }

  navegarAProducto(codigo: string): void {
    this.router.navigate(['/catalogo/producto', codigo]);
  }
}
