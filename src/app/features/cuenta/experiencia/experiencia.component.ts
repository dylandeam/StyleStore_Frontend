import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ExperienciaService, CalificacionServicio, Reclamo } from '../../../core/services/experiencia.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { VentaService } from '../../../core/services/venta.service';
import { OrdenVenta } from '../../../core/models/venta.model';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-experiencia', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './experiencia.component.html',
  styleUrls: ['./experiencia.component.css'],
})
export class ExperienciaComponent implements OnInit {
  private api = inject(ExperienciaService);
  private auth = inject(AuthService);
  private ventas = inject(VentaService);
  private sucursalesApi = inject(SucursalService);
  private route = inject(ActivatedRoute);

  loading = true;
  calificaciones: CalificacionServicio[] = [];
  reclamos: Reclamo[] = [];
  compras: OrdenVenta[] = [];
  sucursales: Sucursal[] = [];
  mensaje = '';
  error = '';
  tab: 'calificaciones' | 'reclamos' = 'calificaciones';
  calificacion = { orden_venta_id: 0, puntuacion: 5, comentario: '' };
  reclamo = {
    orden_venta_id: 0, calificacion_id: 0, sucursal_id: 0,
    fecha_incidente: new Date().toISOString().slice(0, 10),
    motivo: 'atencion', descripcion: '',
  };
  respuestas: Record<number, string> = {};
  estados: Record<number, string> = {};

  get esCliente(): boolean { return this.auth.currentUser()?.role === 'cliente'; }
  get puedeGestionar(): boolean {
    const user = this.auth.currentUser();
    return !user?.is_platform_admin && ['administrador', 'encargado_sucursal'].includes(user?.role || '');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.tab = params['tab'] === 'reclamos' ? 'reclamos' : 'calificaciones';
      const orderId = Number(params['orden_id'] || 0);
      if (orderId) {
        this.calificacion.orden_venta_id = orderId;
        this.reclamo.orden_venta_id = orderId;
      }
    });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api.getCalificaciones().subscribe({ next: (items) => this.calificaciones = items, error: () => this.error = 'No se pudieron cargar las calificaciones.' });
    this.api.getReclamos().subscribe({
      next: (items) => {
        this.reclamos = items;
        items.forEach((item) => { this.estados[item.id] = item.estado; this.respuestas[item.id] = item.respuesta || ''; });
        this.loading = false;
      },
      error: () => { this.error = 'No se pudieron cargar los reclamos.'; this.loading = false; },
    });
    this.sucursalesApi.getSucursales(true).subscribe({ next: (items) => {
      this.sucursales = items;
      if (!this.reclamo.sucursal_id && items.length) this.reclamo.sucursal_id = items[0].id;
    }});
    if (this.esCliente) {
      this.ventas.getMyPurchases().subscribe({ next: (result) => {
        this.compras = [...(result.compras_carrito || []), ...(result.compras_presenciales || [])]
          .filter((order) => ['pagada', 'entregada', 'completada'].includes(order.estado));
      }});
    }
  }

  guardarCalificacion(): void {
    this.mensaje = ''; this.error = '';
    if (!this.calificacion.orden_venta_id) { this.error = 'Selecciona una compra completada.'; return; }
    this.api.calificar(this.calificacion).subscribe({
      next: (saved) => {
        this.calificaciones = [saved, ...this.calificaciones.filter((item) => item.id !== saved.id)];
        this.mensaje = saved.mensaje || 'Calificación guardada.';
        if (saved.sugerir_reclamo) {
          this.reclamo.orden_venta_id = saved.orden_venta_id;
          this.reclamo.calificacion_id = saved.id;
          this.reclamo.sucursal_id = saved.sucursal_id || this.reclamo.sucursal_id;
        }
      },
      error: (err) => this.error = err?.error?.detail || 'No se pudo guardar la calificación.',
    });
  }

  abrirReclamoDesdeCalificacion(): void { this.tab = 'reclamos'; }

  guardarReclamo(): void {
    this.mensaje = ''; this.error = '';
    if (!this.reclamo.sucursal_id || this.reclamo.descripcion.trim().length < 10) {
      this.error = 'Selecciona la sucursal y describe lo sucedido con al menos 10 caracteres.'; return;
    }
    const payload: any = { ...this.reclamo };
    if (!payload.orden_venta_id) delete payload.orden_venta_id;
    if (!payload.calificacion_id) delete payload.calificacion_id;
    this.api.crearReclamo(payload).subscribe({
      next: (saved) => {
        this.reclamos.unshift(saved); this.mensaje = `Reclamo #${saved.id} registrado. Puedes seguir su estado aquí.`;
        this.reclamo.descripcion = ''; this.reclamo.calificacion_id = 0;
      },
      error: (err) => this.error = err?.error?.detail || 'No se pudo registrar el reclamo.',
    });
  }

  actualizarReclamo(item: Reclamo): void {
    this.api.actualizarReclamo(item.id, this.estados[item.id], this.respuestas[item.id]).subscribe({
      next: (updated) => { this.reclamos = this.reclamos.map((current) => current.id === updated.id ? updated : current); this.mensaje = `Reclamo #${item.id} actualizado y notificado.`; },
      error: (err) => this.error = err?.error?.detail || 'No se pudo actualizar el reclamo.',
    });
  }
}
