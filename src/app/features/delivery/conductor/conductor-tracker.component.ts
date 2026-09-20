import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EnvioService } from '../../../core/services/envio.service';

@Component({
  selector: 'app-conductor-tracker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conductor-tracker.component.html',
  styleUrl: './conductor-tracker.component.css',
})
export class ConductorTrackerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private envioService = inject(EnvioService);

  token = '';
  pedido = signal<any>(null);
  error = signal<string | null>(null);
  isLoading = signal(true);

  // GPS State
  gpsActivo = signal(false);
  gpsStatus = signal('');
  ultimaPosicion = signal<{ lat: number; lon: number } | null>(null);
  enviandoCount = signal(0);

  // Entrega
  entregado = signal(false);
  entregando = signal(false);

  private watchId: number | null = null;
  private intervalId: any = null;
  private pendingLat: number | null = null;
  private pendingLon: number | null = null;
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error.set('Enlace de delivery no válido. No se proporcionó un token.');
      this.isLoading.set(false);
      return;
    }
    this.cargarPedido();
  }

  ngOnDestroy(): void {
    this.detenerGps();
  }

  cargarPedido(): void {
    this.envioService.getPublicConductor(this.token).subscribe({
      next: (data) => {
        this.pedido.set(data);
        this.isLoading.set(false);
        if (data.estado === 'entregado' || data.estado === 'completado') {
          this.entregado.set(true);
        }
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'No se pudo cargar la información del pedido. Verifica el enlace.');
        this.isLoading.set(false);
      },
    });
  }

  iniciarGps(): void {
    if (!navigator.geolocation) {
      this.gpsStatus.set('Tu navegador no soporta GPS. Intenta con Google Chrome.');
      return;
    }

    this.gpsStatus.set('Solicitando permiso de ubicación...');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.pendingLat = pos.coords.latitude;
        this.pendingLon = pos.coords.longitude;
        this.ultimaPosicion.set({ lat: this.pendingLat, lon: this.pendingLon });
        this.gpsActivo.set(true);
        this.gpsStatus.set(`📡 GPS activo — Lat: ${this.pendingLat.toFixed(5)}, Lon: ${this.pendingLon.toFixed(5)}`);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            this.gpsStatus.set('⚠️ Permiso de ubicación denegado. Activa la ubicación en los ajustes de tu navegador.');
            break;
          case err.POSITION_UNAVAILABLE:
            this.gpsStatus.set('⚠️ No se pudo obtener la ubicación. Verifica que el GPS esté encendido.');
            break;
          default:
            this.gpsStatus.set('⚠️ Error al obtener ubicación. Intenta de nuevo.');
        }
        this.gpsActivo.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    // Enviar posición al servidor cada 6 segundos
    this.intervalId = setInterval(() => {
      if (this.pendingLat !== null && this.pendingLon !== null && !this.entregado()) {
        this.envioService.reportarPosicionConductor(this.token, this.pendingLat, this.pendingLon).subscribe({
          next: (res) => {
            this.enviandoCount.update(c => c + 1);
            if (!res.activo) {
              // El pedido fue marcado como entregado desde el admin
              this.entregado.set(true);
              this.detenerGps();
            }
          },
          error: () => {
            // Silently retry on next interval
          },
        });
      }
    }, 6000);
  }

  detenerGps(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.gpsActivo.set(false);
    this.gpsStatus.set('Transmisión GPS detenida.');
  }

  confirmarEntrega(): void {
    if (!confirm('¿Confirmas que el pedido fue entregado al cliente?')) return;

    this.entregando.set(true);
    this.envioService.marcarEntregadoConductor(this.token).subscribe({
      next: () => {
        this.entregado.set(true);
        this.detenerGps();
        this.entregando.set(false);
      },
      error: (err) => {
        alert(err.error?.detail || 'Error al confirmar entrega. Intenta de nuevo.');
        this.entregando.set(false);
      },
    });
  }

  abrirEnMaps(): void {
    const p = this.pedido();
    if (!p) return;

    // Try to open the ubicacion_url if available
    if (p.ubicacion_url) {
      window.open(p.ubicacion_url, '_blank');
      return;
    }

    // Otherwise use the address
    const query = encodeURIComponent(`${p.direccion}, ${p.ciudad}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  llamarCliente(): void {
    const p = this.pedido();
    if (p?.cliente_telefono && p.cliente_telefono !== 'No registrado') {
      window.open(`tel:${p.cliente_telefono}`, '_self');
    }
  }
}
