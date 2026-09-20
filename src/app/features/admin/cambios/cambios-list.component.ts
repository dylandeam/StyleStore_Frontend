import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CambiosService, SolicitudCambioDevolucion } from '../../../core/services/cambios.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-cambios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cambios-list.component.html',
  styleUrls: ['./cambios-list.component.css'],
})
export class CambiosListComponent implements OnInit {
  private cambiosService = inject(CambiosService);
  private sucursalService = inject(SucursalService);
  private cdr = inject(ChangeDetectorRef);

  solicitudes: SolicitudCambioDevolucion[] = [];
  sucursales: Sucursal[] = [];
  loading = true;

  // Filtros
  selectedSucursalId: number | null = null;
  selectedEstado: string = '';

  // Modal responder
  showResponderModal = false;
  selectedSolicitud: SolicitudCambioDevolucion | null = null;
  nuevoEstado: 'aceptada' | 'rechazada' = 'aceptada';
  respuestaEncargado: string = '';
  submittingRespuesta = false;

  // Modal completar en caja
  showCompletarModal = false;
  reponerPrendaOriginal: boolean = true;
  nuevoStockId: number | undefined = undefined;
  submittingCompletar = false;

  toastMessage = '';

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarSolicitudes();
  }

  cargarSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data || [];
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando sucursales:', err),
    });
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.cambiosService
      .listarSolicitudesStaff(this.selectedSucursalId || undefined, this.selectedEstado || undefined)
      .subscribe({
        next: (data) => {
          this.solicitudes = [...(data || [])];
          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando solicitudes:', err);
          this.loading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  abrirModalResponder(sol: SolicitudCambioDevolucion, estado: 'aceptada' | 'rechazada'): void {
    this.selectedSolicitud = sol;
    this.nuevoEstado = estado;
    this.respuestaEncargado = estado === 'aceptada'
      ? 'Tu solicitud ha sido aprobada. Por favor acércate a la sucursal con la prenda y su ticket de venta para realizar el canje en caja.'
      : 'Lamentamos informarte que la solicitud no cumple con los términos de garantía física de la prenda.';
    this.showResponderModal = true;
    this.cdr.markForCheck();
  }

  cerrarModalResponder(): void {
    this.showResponderModal = false;
    this.selectedSolicitud = null;
    this.submittingRespuesta = false;
    this.cdr.markForCheck();
  }

  enviarRespuesta(): void {
    if (!this.selectedSolicitud || !this.respuestaEncargado.trim()) return;

    this.submittingRespuesta = true;
    this.cdr.markForCheck();

    this.cambiosService
      .responderSolicitud(this.selectedSolicitud.id, this.nuevoEstado, this.respuestaEncargado)
      .subscribe({
        next: () => {
          this.mostrarToast(`Solicitud #${this.selectedSolicitud?.id} ${this.nuevoEstado} con éxito.`);
          this.cerrarModalResponder();
          this.cargarSolicitudes();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.submittingRespuesta = false;
          this.cdr.markForCheck();
          alert(err.error?.detail || 'Error al responder a la solicitud');
        },
      });
  }

  abrirModalCompletar(sol: SolicitudCambioDevolucion): void {
    this.selectedSolicitud = sol;
    this.reponerPrendaOriginal = true;
    this.nuevoStockId = undefined;
    this.showCompletarModal = true;
    this.cdr.markForCheck();
  }

  cerrarModalCompletar(): void {
    this.showCompletarModal = false;
    this.selectedSolicitud = null;
    this.submittingCompletar = false;
    this.cdr.markForCheck();
  }

  ejecutarCompletarEnCaja(): void {
    if (!this.selectedSolicitud) return;

    this.submittingCompletar = true;
    this.cdr.markForCheck();

    this.cambiosService
      .completarEnCaja(this.selectedSolicitud.id, this.reponerPrendaOriginal, this.nuevoStockId)
      .subscribe({
        next: () => {
          this.mostrarToast(`Canje/Devolución #${this.selectedSolicitud?.id} completado con éxito en caja.`);
          this.cerrarModalCompletar();
          this.cargarSolicitudes();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.submittingCompletar = false;
          this.cdr.markForCheck();
          alert(err.error?.detail || 'Error al procesar en caja');
        },
      });
  }

  mostrarToast(msg: string): void {
    this.toastMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }
}
