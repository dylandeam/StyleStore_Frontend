import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../../core/services/reportes.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
})
export class ReportesComponent implements OnInit {
  private reportesService = inject(ReportesService);
  private sucursalService = inject(SucursalService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  sucursales: Sucursal[] = [];
  mensajeToast: string | null = null;
  descargando: boolean = false;

  // Previsualización interactiva
  tipoPrevisualizacion: 'ventas' | 'inventario' | null = null;
  cargandoPreview: boolean = false;
  datosPreviewVentas: { total_registros: number; total_monto: number; items: any[] } | null = null;
  datosPreviewInventario: { total_registros: number; total_criticos: number; items: any[] } | null = null;

  // Filtros de Ventas
  ventasFechaInicio: string = '';
  ventasFechaFin: string = '';
  ventasSucursalId: number | '' = '';
  ventasMetodoPago: string = '';

  // Filtros de Inventario
  invSucursalId: number | '' = '';
  invSoloBajoStock: boolean = false;

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.sucursales = data;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  previsualizarVentas(): void {
    this.tipoPrevisualizacion = 'ventas';
    this.cargandoPreview = true;
    this.datosPreviewVentas = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.reportesService
      .previewVentas({
        fecha_inicio: this.ventasFechaInicio || undefined,
        fecha_fin: this.ventasFechaFin || undefined,
        sucursal_id: this.ventasSucursalId ? Number(this.ventasSucursalId) : undefined,
        metodo_pago: this.ventasMetodoPago || undefined,
      })
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.datosPreviewVentas = data;
            this.cargandoPreview = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            this.scrollHaciaPreview();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.cargandoPreview = false;
            const msg = err?.error?.detail || 'Error al obtener la previsualización de ventas.';
            this.mostrarToast(msg);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  previsualizarInventario(): void {
    this.tipoPrevisualizacion = 'inventario';
    this.cargandoPreview = true;
    this.datosPreviewInventario = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.reportesService
      .previewInventario({
        sucursal_id: this.invSucursalId ? Number(this.invSucursalId) : undefined,
        solo_bajo_stock: this.invSoloBajoStock,
      })
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.datosPreviewInventario = data;
            this.cargandoPreview = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            this.scrollHaciaPreview();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.cargandoPreview = false;
            const msg = err?.error?.detail || 'Error al obtener la previsualización de inventario.';
            this.mostrarToast(msg);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  cerrarPreview(): void {
    this.tipoPrevisualizacion = null;
    this.datosPreviewVentas = null;
    this.datosPreviewInventario = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  scrollHaciaPreview(): void {
    setTimeout(() => {
      const el = document.getElementById('seccion-preview-reporte');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  descargarVentasExcel(): void {
    this.descargando = true;
    this.reportesService
      .exportarVentasExcel({
        fecha_inicio: this.ventasFechaInicio || undefined,
        fecha_fin: this.ventasFechaFin || undefined,
        sucursal_id: this.ventasSucursalId ? Number(this.ventasSucursalId) : undefined,
        metodo_pago: this.ventasMetodoPago || undefined,
      })
      .subscribe({
        next: (blob) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.guardarArchivo(blob, 'reporte_ventas.xlsx');
            this.mostrarToast('Reporte de Ventas descargado en formato Excel.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.mostrarToast('Error al generar el reporte de ventas.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  descargarVentasPDF(): void {
    this.descargando = true;
    this.reportesService
      .exportarVentasPDF({
        fecha_inicio: this.ventasFechaInicio || undefined,
        fecha_fin: this.ventasFechaFin || undefined,
        sucursal_id: this.ventasSucursalId ? Number(this.ventasSucursalId) : undefined,
        metodo_pago: this.ventasMetodoPago || undefined,
      })
      .subscribe({
        next: (blob) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.guardarArchivo(blob, 'reporte_ventas.pdf');
            this.mostrarToast('Reporte de Ventas descargado en formato PDF.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.mostrarToast('Error al generar el reporte en PDF.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  descargarInventarioExcel(): void {
    this.descargando = true;
    this.reportesService
      .exportarInventarioExcel({
        sucursal_id: this.invSucursalId ? Number(this.invSucursalId) : undefined,
        solo_bajo_stock: this.invSoloBajoStock,
      })
      .subscribe({
        next: (blob) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.guardarArchivo(blob, 'reporte_inventario.xlsx');
            this.mostrarToast('Reporte de Inventario descargado en Excel.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.mostrarToast('Error al generar el reporte de inventario.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  descargarInventarioPDF(): void {
    this.descargando = true;
    this.reportesService
      .exportarInventarioPDF({
        sucursal_id: this.invSucursalId ? Number(this.invSucursalId) : undefined,
        solo_bajo_stock: this.invSoloBajoStock,
      })
      .subscribe({
        next: (blob) => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.guardarArchivo(blob, 'reporte_inventario.pdf');
            this.mostrarToast('Reporte de Inventario descargado en PDF.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.descargando = false;
            this.mostrarToast('Error al generar el reporte en PDF.');
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  private guardarArchivo(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensajeToast = null;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 3500);
  }
}

