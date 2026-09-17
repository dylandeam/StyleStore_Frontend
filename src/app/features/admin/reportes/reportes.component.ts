import { Component, OnInit, inject } from '@angular/core';
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

  sucursales: Sucursal[] = [];
  mensajeToast: string | null = null;
  descargando: boolean = false;

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
        this.sucursales = data;
      },
      error: () => {},
    });
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
          this.descargando = false;
          this.guardarArchivo(blob, 'reporte_ventas.xlsx');
          this.mostrarToast('Reporte de Ventas descargado en formato Excel.');
        },
        error: () => {
          this.descargando = false;
          this.mostrarToast('Error al generar el reporte de ventas.');
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
          this.descargando = false;
          this.guardarArchivo(blob, 'reporte_ventas.pdf');
          this.mostrarToast('Reporte de Ventas descargado en formato PDF.');
        },
        error: () => {
          this.descargando = false;
          this.mostrarToast('Error al generar el reporte en PDF.');
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
          this.descargando = false;
          this.guardarArchivo(blob, 'reporte_inventario.xlsx');
          this.mostrarToast('Reporte de Inventario descargado en Excel.');
        },
        error: () => {
          this.descargando = false;
          this.mostrarToast('Error al generar el reporte de inventario.');
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
          this.descargando = false;
          this.guardarArchivo(blob, 'reporte_inventario.pdf');
          this.mostrarToast('Reporte de Inventario descargado en PDF.');
        },
        error: () => {
          this.descargando = false;
          this.mostrarToast('Error al generar el reporte en PDF.');
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
    window.URL.revokeObjectURL(url);
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    setTimeout(() => {
      this.mensajeToast = null;
    }, 3500);
  }
}
