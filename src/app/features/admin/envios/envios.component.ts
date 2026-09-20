import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnvioService } from '../../../core/services/envio.service';
import { AuthService } from '../../../core/services/auth.service';
import { Envio, EnvioUpdate } from '../../../core/models/envio.model';

declare var L: any;

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './envios.component.html',
  styleUrl: './envios.component.css',
})
export class EnviosComponent implements OnInit {
  private envioService = inject(EnvioService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  envios = signal<Envio[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  selectedEnvio = signal<Envio | null>(null);
  isEditModalOpen = signal<boolean>(false);
  isDeliveryModalOpen = signal<boolean>(false);
  editEstado = signal<string>('pendiente');
  editDireccion = signal<string>('');
  editCiudad = signal<string>('');
  editCosto = signal<number>(0);
  editReferencia = signal<string>('');
  editUbicacionUrl = signal<string>('');

  // Delivery StyleStore Tracking
  editDeliveryConductor = signal<string>('');

  // Mapa Leaflet + OSM
  isMapModalOpen: boolean = false;
  trackingData: any = null;
  private mapInstance: any = null;

  get isRepartidor(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'repartidor';
  }

  ngOnInit(): void {
    this.loadEnvios();
    this.loadLeafletAssets();
  }

  loadLeafletAssets(): void {
    if (typeof window !== 'undefined' && !(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => console.log('Leaflet cargado exitosamente');
      document.head.appendChild(script);
    }
  }

  // ─── Modal Delivery StyleStore ───

  openDeliveryModal(e: Envio): void {
    this.selectedEnvio.set(e);
    this.editDeliveryConductor.set(e.delivery_conductor || '');
    this.editEstado.set(e.estado || 'en camino');
    this.isDeliveryModalOpen.set(true);
  }

  closeDeliveryModal(): void {
    this.isDeliveryModalOpen.set(false);
  }

  copiarLinkConductor(): void {
    const token = this.selectedEnvio()?.token_seguimiento;
    if (!token) return;
    const url = `${window.location.origin}/delivery/conductor/${token}`;
    this.copiarAlPortapapeles(url, '¡Link del Conductor copiado! Envíalo por WhatsApp al repartidor.');
  }

  copiarLinkCliente(): void {
    const token = this.selectedEnvio()?.token_seguimiento;
    if (!token) return;
    const url = `${window.location.origin}/delivery/rastreo/${token}`;
    this.copiarAlPortapapeles(url, '¡Link de Rastreo del Cliente copiado!');
  }

  private copiarAlPortapapeles(text: string, msg: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.successMessage.set(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
      }).catch(() => {
        this.copiarFallback(text, msg);
      });
    } else {
      this.copiarFallback(text, msg);
    }
  }

  copiarUbicacion(url?: string): void {
    if (!url) return;
    this.copiarAlPortapapeles(url, '¡Enlace de ubicación copiado!');
  }

  private copiarFallback(text: string, msg: string): void {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  saveDeliveryTracking(): void {
    if (!this.selectedEnvio()) return;
    this.isLoading.set(true);

    this.envioService
      .updateDeliveryTracking(this.selectedEnvio()!.id, {
        delivery_conductor: this.editDeliveryConductor().trim(),
        estado: this.editEstado(),
      })
      .subscribe({
        next: () => {
          this.successMessage.set(`Delivery asignado al Envío #${this.selectedEnvio()!.id}`);
          this.closeDeliveryModal();
          this.loadEnvios();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Error al actualizar delivery.');
          this.isLoading.set(false);
        },
      });
  }

  // ─── Listado ───

  loadEnvios(): void {
    this.isLoading.set(true);
    this.envioService.getEnvios().subscribe({
      next: (data) => {
        this.envios.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage.set('Error al cargar la lista de envíos.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Edit Modal ───

  openEdit(e: Envio): void {
    this.selectedEnvio.set(e);
    this.editEstado.set(e.estado);
    this.editDireccion.set(e.direccion);
    this.editCiudad.set(e.ciudad);
    this.editCosto.set(e.costo);
    this.editReferencia.set(e.referencia || '');
    this.editUbicacionUrl.set(e.ubicacion_url || '');
    this.isEditModalOpen.set(true);
  }

  closeEdit(): void {
    this.isEditModalOpen.set(false);
  }

  saveEdit(): void {
    if (!this.selectedEnvio()) return;

    this.isLoading.set(true);
    const updateData: EnvioUpdate = {
      estado: this.editEstado(),
      direccion: this.editDireccion().trim(),
      ciudad: this.editCiudad().trim(),
      costo: this.editCosto(),
      referencia: this.editReferencia().trim() || undefined,
      ubicacion_url: this.editUbicacionUrl().trim() || undefined,
    };

    this.envioService.updateEnvio(this.selectedEnvio()!.id, updateData).subscribe({
      next: () => {
        this.successMessage.set(`Envío #${this.selectedEnvio()!.id} actualizado.`);
        this.closeEdit();
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al actualizar envío.');
        this.isLoading.set(false);
      },
    });
  }

  deleteEnvio(e: Envio): void {
    if (!confirm(`¿Eliminar el envío #${e.id}?`)) return;

    this.isLoading.set(true);
    this.envioService.deleteEnvio(e.id).subscribe({
      next: () => {
        this.successMessage.set(`Envío #${e.id} eliminado.`);
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar envío.');
        this.isLoading.set(false);
      },
    });
  }

  // ==============================================================
  // MAPA INTERACTIVO LEAFLET + OSM
  // ==============================================================

  abrirMapaTracking(envio: Envio): void {
    this.selectedEnvio.set(envio);
    this.isMapModalOpen = true;
    this.trackingData = null;
    this.cdr.markForCheck();

    this.envioService.getTrackingMap(envio.id).subscribe({
      next: (data) => {
        this.trackingData = data;
        this.cdr.markForCheck();
        setTimeout(() => this.iniciarMapaLeaflet(data), 200);
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo cargar la información de tracking geográfico.');
        this.cerrarMapaModal();
      },
    });
  }

  cerrarMapaModal(): void {
    this.isMapModalOpen = false;
    if (this.mapInstance) {
      try {
        this.mapInstance.remove();
      } catch (e) {}
      this.mapInstance = null;
    }
    this.cdr.markForCheck();
  }

  private iniciarMapaLeaflet(data: any): void {
    const mapEl = document.getElementById('leaflet-map-element');
    if (!mapEl || !(window as any).L) return;

    const L = (window as any).L;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    const orig = [data.origen.lat, data.origen.lon];
    const dest = [data.destino.lat, data.destino.lon];

    this.mapInstance = L.map(mapEl).setView(orig, 13);

    // Tiles libres de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | StyleStore Logistics',
    }).addTo(this.mapInstance);

    // Marcador Origen (Sucursal)
    const markerOrigen = L.marker(orig)
      .addTo(this.mapInstance)
      .bindPopup(`<b>🏬 Origen: ${data.origen.nombre}</b><br>${data.origen.ciudad}`)
      .openPopup();

    // Marcador Destino (Cliente)
    const markerDestino = L.marker(dest)
      .addTo(this.mapInstance)
      .bindPopup(`<b>📍 Destino de Entrega</b><br>${data.destino.direccion}<br>${data.destino.ciudad}`);

    // Marcador Repartidor si está en camino
    let puntosRuta = [orig, dest];
    if (data.repartidor) {
      const repPos = [data.repartidor.lat, data.repartidor.lon];
      puntosRuta = [orig, repPos, dest];
      L.marker(repPos)
        .addTo(this.mapInstance)
        .bindPopup(`<b>🛵 ${data.repartidor.nombre}</b><br>En camino hacia el destino.`);
    }

    // Trazar línea de ruta
    const polyline = L.polyline(puntosRuta, {
      color: '#14263D',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
    }).addTo(this.mapInstance);

    // Ajustar zoom a los marcadores
    this.mapInstance.fitBounds(polyline.getBounds(), { padding: [40, 40] });
  }

  // Acciones de Repartidor
  cambiarEstadoDespacho(envio: Envio, nuevoEstado: string): void {
    this.envioService.actualizarEstado(envio.id, nuevoEstado).subscribe({
      next: (res) => {
        this.successMessage.set(`Envío #${envio.id} marcado como "${nuevoEstado}".`);
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => alert(err.error?.detail || 'Error al actualizar estado'),
    });
  }

  simularGpsRepartidor(envio: Envio): void {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.enviarPosicionGps(envio.id, pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback a posición de prueba cercana
          const lat = (envio as any).latitud_destino ? Number((envio as any).latitud_destino) - 0.005 : -16.505;
          const lon = (envio as any).longitud_destino ? Number((envio as any).longitud_destino) - 0.005 : -68.145;
          this.enviarPosicionGps(envio.id, lat, lon);
        }
      );
    } else {
      const lat = -16.505;
      const lon = -68.145;
      this.enviarPosicionGps(envio.id, lat, lon);
    }
  }

  private enviarPosicionGps(envioId: number, lat: number, lon: number): void {
    this.envioService.actualizarPosicion(envioId, lat, lon).subscribe({
      next: () => {
        this.successMessage.set(`📍 Posición GPS enviada en tiempo real.`);
        this.loadEnvios();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => alert(err.error?.detail || 'Error al actualizar GPS'),
    });
  }
}
