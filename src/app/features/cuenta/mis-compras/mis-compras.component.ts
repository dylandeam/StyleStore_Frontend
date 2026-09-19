import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VentaService } from '../../../core/services/venta.service';
import { CambiosService, SolicitudCambioCreate } from '../../../core/services/cambios.service';
import { OrdenVenta } from '../../../core/models/venta.model';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.css'],
})
export class MisComprasComponent implements OnInit {
  private ventaService = inject(VentaService);
  private cambiosService = inject(CambiosService);

  loading = true;
  compras: OrdenVenta[] = [];
  selectedOrden: OrdenVenta | null = null;
  showDetailModal = false;

  // Modal de solicitud de cambio/devolución
  showCambioModal = false;
  cambioSubmitting = false;
  cambioSuccessMessage = '';
  cambioErrorMessage = '';

  solicitud: SolicitudCambioCreate = {
    orden_venta_id: 0,
    tipo: 'cambio',
    motivo: 'talla_incorrecta',
    descripcion: '',
    producto_detalle_id: undefined,
    talla_solicitada: '',
    color_solicitado: '',
  };

  ngOnInit(): void {
    this.cargarCompras();
  }

  cargarCompras(): void {
    this.loading = true;
    this.ventaService.getMyPurchases().subscribe({
      next: (res) => {
        const todas = [...(res.compras_carrito || []), ...(res.compras_presenciales || [])];
        todas.sort((a, b) => new Date(b.created_at || b.fecha).getTime() - new Date(a.created_at || a.fecha).getTime());
        this.compras = todas;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar compras:', err);
        this.loading = false;
      },
    });
  }

  verDetalle(orden: OrdenVenta): void {
    this.selectedOrden = orden;
    this.showDetailModal = true;
  }

  cerrarDetalle(): void {
    this.showDetailModal = false;
    this.selectedOrden = null;
  }

  // Verifica si está dentro de los 7 días de gracia para cambios/devoluciones
  isEligibleForCambio(orden: OrdenVenta): boolean {
    if (orden.estado !== 'pagada' && orden.estado !== 'entregada') {
      return false;
    }
    const fechaOrden = new Date(orden.created_at || orden.fecha);
    const ahora = new Date();
    const diffDias = (ahora.getTime() - fechaOrden.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias <= 7;
  }

  diasRestantesCambio(orden: OrdenVenta): number {
    const fechaOrden = new Date(orden.created_at || orden.fecha);
    const ahora = new Date();
    const diffDias = (ahora.getTime() - fechaOrden.getTime()) / (1000 * 60 * 60 * 24);
    const restantes = Math.max(0, Math.ceil(7 - diffDias));
    return restantes;
  }

  fechaProgramada = '';

  abrirModalCambio(orden: OrdenVenta): void {
    this.selectedOrden = orden;
    this.cambioSuccessMessage = '';
    this.cambioErrorMessage = '';
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    this.fechaProgramada = manana.toISOString().split('T')[0];

    const firstDetalleId = orden.detalles && orden.detalles.length > 0 ? orden.detalles[0].id : 0;

    this.solicitud = {
      orden_venta_id: orden.id,
      tipo: 'cambio',
      motivo: 'talla_incorrecta',
      descripcion: '',
      producto_detalle_id: firstDetalleId,
      talla_solicitada: '',
      color_solicitado: '',
    };
    this.showCambioModal = true;
  }

  cerrarModalCambio(): void {
    this.showCambioModal = false;
    this.cambioSubmitting = false;
  }

  enviarSolicitudCambio(): void {
    const desc = (this.solicitud.descripcion || '').trim();
    if (!desc) {
      this.cambioErrorMessage = 'Por favor ingresa una descripción o motivo para la solicitud.';
      return;
    }

    const detalleId = this.solicitud.producto_detalle_id || (this.selectedOrden?.detalles?.[0]?.id ?? 0);
    const sucursalId = this.selectedOrden?.sucursal_id || 1;

    this.cambioSubmitting = true;
    this.cambioErrorMessage = '';
    this.cambioSuccessMessage = '';

    this.cambiosService.solicitarCambio({
      orden_venta_id: this.solicitud.orden_venta_id,
      detalle_venta_id: detalleId,
      tipo: this.solicitud.tipo,
      motivo: this.solicitud.motivo,
      sucursal_id: sucursalId,
      fecha_programada: this.fechaProgramada || new Date().toISOString().split('T')[0],
      descripcion_problema: desc,
    }).subscribe({
      next: () => {
        this.cambioSubmitting = false;
        this.cambioSuccessMessage = 'Tu solicitud ha sido registrada con éxito. Un encargado de StyleStore la revisará en breve.';
        setTimeout(() => {
          this.cerrarModalCambio();
        }, 2500);
      },
      error: (err) => {
        this.cambioSubmitting = false;
        this.cambioErrorMessage = err.error?.detail || 'No se pudo enviar la solicitud. Verifica el plazo de 7 días.';
      },
    });
  }
}
