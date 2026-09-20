import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ventaService = inject(VentaService);
  private cambiosService = inject(CambiosService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  compras: OrdenVenta[] = [];
  selectedOrden: OrdenVenta | null = null;
  showDetailModal = false;

  // Tabs: 'todas' | 'cambios'
  tabActiva: 'todas' | 'cambios' = 'todas';

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

  fechaProgramada = '';
  coloresDisponibles: any[] = [];
  tallasDisponibles: any[] = [];
  cargandoOpciones = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.tabActiva = params['tab'] === 'cambios' ? 'cambios' : 'todas';
      this.cargarCompras();
      this.cdr.markForCheck();
    });
  }

  cambiarTab(tab: 'todas' | 'cambios'): void {
    this.tabActiva = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'cambios' ? 'cambios' : null },
      queryParamsHandling: 'merge',
    });
    this.cdr.markForCheck();
  }

  get comprasSemana(): OrdenVenta[] {
    return this.compras.filter((o) => this.isEligibleForCambio(o));
  }

  cargarCompras(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.ventaService.getMyPurchases().subscribe({
      next: (res) => {
        const todas = [...(res.compras_carrito || []), ...(res.compras_presenciales || [])];
        todas.sort((a, b) => new Date(b.created_at || b.fecha).getTime() - new Date(a.created_at || a.fecha).getTime());
        this.compras = todas;
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar compras:', err);
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  verDetalle(orden: OrdenVenta): void {
    this.selectedOrden = orden;
    this.showDetailModal = true;
    this.cdr.markForCheck();
  }

  cerrarDetalle(): void {
    this.showDetailModal = false;
    this.selectedOrden = null;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();

    if (firstDetalleId) {
      this.cargarOpcionesParaDetalle(firstDetalleId);
    }
  }

  cargarOpcionesParaDetalle(detalleId: any): void {
    const dId = Number(detalleId);
    this.solicitud.producto_detalle_id = dId;
    this.solicitud.talla_solicitada = '';
    this.solicitud.color_solicitado = '';
    this.coloresDisponibles = [];
    this.tallasDisponibles = [];

    const detalle = this.selectedOrden?.detalles?.find((d) => d.id === dId);
    if (!detalle) return;

    const prodCod = detalle.producto_codigo || detalle.producto_nombre;
    const sucId = this.selectedOrden?.sucursal_id || 1;

    this.cargandoOpciones = true;
    this.cdr.markForCheck();

    this.cambiosService.getOpcionesDisponibles(prodCod, sucId).subscribe({
      next: (res) => {
        this.cargandoOpciones = false;
        this.coloresDisponibles = res.colores || [];
        this.tallasDisponibles = res.tallas || [];
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoOpciones = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModalCambio(): void {
    this.showCambioModal = false;
    this.cambioSubmitting = false;
    this.cdr.markForCheck();
  }

  enviarSolicitudCambio(): void {
    const desc = (this.solicitud.descripcion || '').trim();
    if (!desc) {
      this.cambioErrorMessage = 'Por favor ingresa una descripción o motivo para la solicitud.';
      this.cdr.markForCheck();
      return;
    }

    const detalleId = this.solicitud.producto_detalle_id || (this.selectedOrden?.detalles?.[0]?.id ?? 0);
    const sucursalId = this.selectedOrden?.sucursal_id || 1;

    this.cambioSubmitting = true;
    this.cambioErrorMessage = '';
    this.cambioSuccessMessage = '';
    this.cdr.markForCheck();

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
        this.cargarCompras();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cerrarModalCambio();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 2200);
      },
      error: (err) => {
        this.cambioSubmitting = false;
        this.cambioErrorMessage = err.error?.detail || 'No se pudo enviar la solicitud. Verifica el plazo de 7 días.';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }
}
