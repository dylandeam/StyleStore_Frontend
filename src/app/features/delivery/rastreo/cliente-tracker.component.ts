import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EnvioService } from '../../../core/services/envio.service';

declare var L: any;

@Component({
  selector: 'app-cliente-tracker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cliente-tracker.component.html',
  styleUrl: './cliente-tracker.component.css',
})
export class ClienteTrackerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private envioService = inject(EnvioService);

  token = '';
  tracking = signal<any>(null);
  error = signal<string | null>(null);
  isLoading = signal(true);
  entregado = signal(false);
  currentYear = new Date().getFullYear();

  private mapInstance: any = null;
  private repartidorMarker: any = null;
  private pollingInterval: any = null;
  private leafletReady = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error.set('Enlace de rastreo no válido.');
      this.isLoading.set(false);
      return;
    }
    this.loadLeafletAssets();
    this.cargarRastreo();
  }

  ngOnDestroy(): void {
    this.detenerPolling();
    if (this.mapInstance) {
      try { this.mapInstance.remove(); } catch (e) {}
      this.mapInstance = null;
    }
  }

  private loadLeafletAssets(): void {
    if (typeof window === 'undefined') return;

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        this.leafletReady = true;
        if (this.tracking()) {
          setTimeout(() => this.iniciarMapa(this.tracking()), 200);
        }
      };
      document.head.appendChild(script);
    } else {
      this.leafletReady = true;
    }
  }

  cargarRastreo(): void {
    this.envioService.getRastreoCliente(this.token).subscribe({
      next: (data) => {
        this.tracking.set(data);
        this.isLoading.set(false);

        if (data.estado === 'entregado' || data.estado === 'completado') {
          this.entregado.set(true);
        } else {
          // Start polling every 5 seconds
          this.iniciarPolling();
        }

        if (this.leafletReady) {
          setTimeout(() => this.iniciarMapa(data), 300);
        }
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'No se pudo cargar la información de rastreo.');
        this.isLoading.set(false);
      },
    });
  }

  private iniciarPolling(): void {
    this.pollingInterval = setInterval(() => {
      this.envioService.getRastreoCliente(this.token).subscribe({
        next: (data) => {
          this.tracking.set(data);

          if (data.estado === 'entregado' || data.estado === 'completado') {
            this.entregado.set(true);
            this.detenerPolling();
            return;
          }

          // Update repartidor marker position smoothly
          if (data.repartidor && this.repartidorMarker) {
            const newPos = [data.repartidor.lat, data.repartidor.lon];
            this.repartidorMarker.setLatLng(newPos);
          } else if (data.repartidor && this.mapInstance && !this.repartidorMarker) {
            this.agregarMarcadorRepartidor(data.repartidor);
          }
        },
        error: () => {
          // Silently ignore polling errors
        },
      });
    }, 5000);
  }

  private detenerPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private iniciarMapa(data: any): void {
    const mapEl = document.getElementById('cliente-map-element');
    if (!mapEl || !(window as any).L) return;

    const L = (window as any).L;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
      this.repartidorMarker = null;
    }

    const orig = [data.origen.lat, data.origen.lon];
    const dest = [data.destino.lat, data.destino.lon];

    this.mapInstance = L.map(mapEl).setView(orig, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | StyleStore Delivery',
    }).addTo(this.mapInstance);

    // Sucursal Marker
    const sucursalIcon = L.divIcon({
      html: '<div style="font-size:1.5rem;text-align:center;">🏬</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: 'custom-div-icon',
    });
    L.marker(orig, { icon: sucursalIcon })
      .addTo(this.mapInstance)
      .bindPopup(`<b>🏬 ${data.origen.nombre}</b><br>${data.origen.ciudad}`);

    // Destino Marker
    const destinoIcon = L.divIcon({
      html: '<div style="font-size:1.5rem;text-align:center;">🏠</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: 'custom-div-icon',
    });
    L.marker(dest, { icon: destinoIcon })
      .addTo(this.mapInstance)
      .bindPopup(`<b>📍 Tu Domicilio</b><br>${data.destino.direccion}<br>${data.destino.ciudad}`);

    // Route line
    const routePoints = [orig, dest];
    L.polyline(routePoints, {
      color: '#C9A96E',
      weight: 3,
      opacity: 0.6,
      dashArray: '8, 8',
    }).addTo(this.mapInstance);

    // Repartidor marker
    if (data.repartidor) {
      this.agregarMarcadorRepartidor(data.repartidor);
      const bounds = L.latLngBounds([orig, dest, [data.repartidor.lat, data.repartidor.lon]]);
      this.mapInstance.fitBounds(bounds, { padding: [40, 40] });
    } else {
      const bounds = L.latLngBounds([orig, dest]);
      this.mapInstance.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private agregarMarcadorRepartidor(rep: any): void {
    if (!this.mapInstance || !(window as any).L) return;
    const L = (window as any).L;

    const motoIcon = L.divIcon({
      html: '<div style="font-size:1.8rem;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🛵</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'custom-div-icon',
    });

    this.repartidorMarker = L.marker([rep.lat, rep.lon], { icon: motoIcon })
      .addTo(this.mapInstance)
      .bindPopup('<b>🛵 Tu Repartidor</b><br>En camino hacia tu domicilio.');
  }
}
