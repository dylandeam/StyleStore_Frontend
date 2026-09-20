import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraService } from '../../../../core/services/compra.service';
import { ProveedoresService } from '../../../../core/services/proveedores.service';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { ColoresService } from '../../../../core/services/colores.service';
import { TallasService } from '../../../../core/services/tallas.service';
import { Compra, CompraCreate, DetalleCompraCreate } from '../../../../core/models/compra.model';
import { Proveedor } from '../../../../core/models/proveedor.model';
import { Sucursal } from '../../../../core/models/sucursal.model';
import { Producto } from '../../../../core/models/producto.model';
import { Color } from '../../../../core/models/color.model';
import { Talla } from '../../../../core/models/talla.model';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compras-list.component.html',
  styleUrls: ['./compras-list.component.css'],
})
export class ComprasListComponent implements OnInit {
  private compraService = inject(CompraService);
  private proveedorService = inject(ProveedoresService);
  private sucursalService = inject(SucursalService);
  private productoService = inject(ProductoService);
  private coloresService = inject(ColoresService);
  private tallasService = inject(TallasService);
  private cdr = inject(ChangeDetectorRef);

  compras: Compra[] = [];
  proveedores: Proveedor[] = [];
  sucursales: Sucursal[] = [];
  productos: Producto[] = [];
  colores: Color[] = [];
  tallas: Talla[] = [];

  loading: boolean = false;
  guardando: boolean = false;
  toastMsg: string | null = null;
  errorMsg: string | null = null;

  // Filtros
  filtroSucursalId: number | null = null;
  filtroProveedorCodigo: string = '';
  filtroEstado: string = '';

  // Modal Nueva Compra
  showModalNueva: boolean = false;
  nuevaCompra: CompraCreate = {
    proveedor_codigo: '',
    sucursal_id: 0,
    nro_factura: '',
    observaciones: '',
    items: [],
  };

  // Item temporal para agregar
  tempItem: DetalleCompraCreate = {
    producto_codigo: '',
    color_id: 0,
    talla_id: 0,
    cantidad: 1,
    costo_unitario: 0,
  };

  // Modal Detalle
  showModalDetalle: boolean = false;
  compraSeleccionada: Compra | null = null;

  ngOnInit(): void {
    this.cargarDatosMaestros();
    this.cargarCompras();
  }

  cargarDatosMaestros(): void {
    this.proveedorService.getProveedores().subscribe({
      next: (data) => (this.proveedores = data || []),
      error: (e) => console.error(e),
    });
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data || [];
        if (this.sucursales.length > 0 && !this.nuevaCompra.sucursal_id) {
          this.nuevaCompra.sucursal_id = this.sucursales[0].id;
        }
      },
      error: (e) => console.error(e),
    });
    this.productoService.getProductos().subscribe({
      next: (data) => (this.productos = data || []),
      error: (e) => console.error(e),
    });
    this.coloresService.getColores().subscribe({
      next: (data) => (this.colores = data || []),
      error: (e) => console.error(e),
    });
    this.tallasService.getTallas().subscribe({
      next: (data) => (this.tallas = data || []),
      error: (e) => console.error(e),
    });
  }

  cargarCompras(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.compraService
      .getCompras({
        sucursal_id: this.filtroSucursalId || undefined,
        proveedor_codigo: this.filtroProveedorCodigo || undefined,
        estado: this.filtroEstado || undefined,
      })
      .subscribe({
        next: (data) => {
          this.compras = data || [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error(e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  abrirModalNueva(): void {
    this.nuevaCompra = {
      proveedor_codigo: this.proveedores.length > 0 ? this.proveedores[0].codigo : '',
      sucursal_id: this.sucursales.length > 0 ? this.sucursales[0].id : 0,
      nro_factura: '',
      observaciones: '',
      items: [],
    };
    this.resetTempItem();
    this.errorMsg = null;
    this.showModalNueva = true;
    this.cdr.markForCheck();
  }

  cerrarModalNueva(): void {
    this.showModalNueva = false;
    this.cdr.markForCheck();
  }

  resetTempItem(): void {
    this.tempItem = {
      producto_codigo: this.productos.length > 0 ? this.productos[0].codigo : '',
      color_id: this.colores.length > 0 ? this.colores[0].id : 0,
      talla_id: this.tallas.length > 0 ? this.tallas[0].id : 0,
      cantidad: 1,
      costo_unitario: 0,
    };
  }

  agregarItemACompra(): void {
    if (!this.tempItem.producto_codigo) {
      alert('Selecciona un producto.');
      return;
    }
    if (!this.tempItem.color_id) {
      alert('Selecciona un color.');
      return;
    }
    if (!this.tempItem.talla_id) {
      alert('Selecciona una talla.');
      return;
    }
    if (this.tempItem.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }
    if (this.tempItem.costo_unitario <= 0) {
      alert('El costo unitario debe ser mayor a 0.');
      return;
    }

    this.nuevaCompra.items.push({ ...this.tempItem });
    this.resetTempItem();
    this.cdr.markForCheck();
  }

  eliminarItem(index: number): void {
    this.nuevaCompra.items.splice(index, 1);
    this.cdr.markForCheck();
  }

  get totalNuevaCompra(): number {
    return this.nuevaCompra.items.reduce((sum, item) => sum + item.cantidad * item.costo_unitario, 0);
  }

  guardarCompra(): void {
    if (!this.nuevaCompra.proveedor_codigo) {
      this.errorMsg = 'Debes seleccionar un proveedor.';
      return;
    }
    if (!this.nuevaCompra.sucursal_id) {
      this.errorMsg = 'Debes seleccionar la sucursal de destino.';
      return;
    }
    if (this.nuevaCompra.items.length === 0) {
      this.errorMsg = 'Debes agregar al menos una prenda para abastecer el inventario.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.compraService.createCompra(this.nuevaCompra).subscribe({
      next: (res) => {
        this.guardando = false;
        this.cerrarModalNueva();
        this.mostrarToast(`¡Compra #${res.id} registrada! Inventario abastecido correctamente.`);
        this.cargarCompras();
      },
      error: (err) => {
        this.guardando = false;
        this.errorMsg = err.error?.detail || 'Error al registrar la compra.';
        this.cdr.markForCheck();
      },
    });
  }

  verDetalle(compra: Compra): void {
    this.compraSeleccionada = compra;
    this.showModalDetalle = true;
    this.cdr.markForCheck();
  }

  cerrarModalDetalle(): void {
    this.showModalDetalle = false;
    this.compraSeleccionada = null;
    this.cdr.markForCheck();
  }

  anularCompra(compra: Compra): void {
    if (!confirm(`¿Estás seguro de anular la Compra #${compra.id}? Esto revertirá las existencias en la sucursal de destino.`)) {
      return;
    }

    this.compraService.anularCompra(compra.id).subscribe({
      next: () => {
        this.mostrarToast(`Compra #${compra.id} anulada y existencias revertidas con éxito.`);
        this.cargarCompras();
      },
      error: (err) => {
        alert(err.error?.detail || 'Error al anular la compra.');
      },
    });
  }

  mostrarToast(msg: string): void {
    this.toastMsg = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastMsg = null;
      this.cdr.markForCheck();
    }, 4000);
  }

  getNombreProducto(codigo: string): string {
    const p = this.productos.find((x) => x.codigo === codigo);
    return p ? p.nombre : codigo;
  }

  getNombreColor(id: number): string {
    const c = this.colores.find((x) => x.id === id);
    return c ? c.nombre : id.toString();
  }

  getNombreTalla(id: number): string {
    const t = this.tallas.find((x) => x.id === id);
    return t ? t.nombre : id.toString();
  }
}
