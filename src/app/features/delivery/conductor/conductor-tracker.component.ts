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

  isSecureContext = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;
  simulandoRuta = signal(false);
  private pasoSimulacion = 0;

  iniciarGps(): void {
    if (!navigator.geolocation) {
      this.gpsStatus.set('Tu navegador no soporta el sensor GPS.');
      return;
    }

    if (!this.isSecureContext) {
      this.gpsStatus.set('⚠️ Safari en iOS requiere conexión HTTPS segura para el GPS. Puedes usar el botón "Fijar Ubicación / Simular Avance".');
    } else {
      this.gpsStatus.set('Solicitando acceso a ubicación en Safari/navegador...');
    }

    // Paso 1 (Compatible con Safari en iPhone): Obtener fix rápido con baja precisión para evitar timeouts
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.procesarNuevaUbicacion(pos.coords.latitude, pos.coords.longitude);
        this.iniciarWatchGps();
      },
      (err) => {
        // Si la solicitud de baja precisión falló, intentar de todas formas con watchPosition o dar aviso
        console.warn('GPS initial fix warning:', err);
        if (err.code === err.PERMISSION_DENIED) {
          this.gpsStatus.set('⚠️ Permiso denegado. En tu iPhone ve a Ajustes > Privacidad > Localización > Safari y selecciona "Al usar la app".');
        } else {
          this.gpsStatus.set('Iniciando seguimiento continuo...');
          this.iniciarWatchGps();
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 10000,
      }
    );
  }

  private iniciarWatchGps(): void {
    if (this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.procesarNuevaUbicacion(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            this.gpsStatus.set('⚠️ Permiso de ubicación denegado en Safari. Puedes usar el botón de abajo para fijar tu avance.');
            break;
          case err.POSITION_UNAVAILABLE:
            this.gpsStatus.set('⚠️ Señal de GPS débil o apagada. Verifica los ajustes de ubicación de tu dispositivo.');
            break;
          case err.TIMEOUT:
            // En iOS timeout ocasional es normal en interiores, reintentar silenciosamente
            break;
          default:
            this.gpsStatus.set('⚠️ Buscando señal GPS estable...');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 25000,
      }
    );

    // Enviar posición periódicamente cada 5 segundos al servidor
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        if (this.pendingLat !== null && this.pendingLon !== null && !this.entregado()) {
          this.enviarPosicionAlServidor(this.pendingLat, this.pendingLon);
        }
      }, 5000);
    }
  }

  private procesarNuevaUbicacion(lat: number, lon: number): void {
    this.pendingLat = lat;
    this.pendingLon = lon;
    this.ultimaPosicion.set({ lat, lon });
    this.gpsActivo.set(true);
    this.gpsStatus.set(`📡 GPS transmitiendo en vivo — Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`);
    // Enviar de inmediato el primer fix sin esperar al intervalo
    this.enviarPosicionAlServidor(lat, lon);
  }

  private enviarPosicionAlServidor(lat: number, lon: number): void {
    this.envioService.reportarPosicionConductor(this.token, lat, lon).subscribe({
      next: (res) => {
        this.enviandoCount.update((c) => c + 1);
        if (res && res.activo === false) {
          this.entregado.set(true);
          this.detenerGps();
        }
      },
      error: () => {
        // Silently retry on next interval
      },
    });
  }

  simularAvanceRuta(): void {
    this.simulandoRuta.set(true);
    const p = this.pedido();
    // Coordenadas base de Santa Cruz si no hay destino específico
    const destLat = p?.latitud_destino ? Number(p.latitud_destino) : -17.7833;
    const destLon = p?.longitud_destino ? Number(p.longitud_destino) : -63.1821;

    // Iniciar cerca de la sucursal o centro y avanzar hacia el destino
    const startLat = destLat - 0.025;
    const startLon = destLon - 0.020;

    const factor = Math.min(1.0, 0.2 + (this.pasoSimulacion * 0.15));
    const lat = startLat + (destLat - startLat) * factor;
    const lon = startLon + (destLon - startLon) * factor;

    this.pasoSimulacion++;
    if (factor >= 1.0) {
      this.pasoSimulacion = 0;
    }

    this.procesarNuevaUbicacion(lat, lon);
    this.gpsStatus.set(`🚗 Ubicación transmitida en Santa Cruz (${(factor * 100).toFixed(0)}% del recorrido hacia el cliente).`);
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
    this.simulandoRuta.set(false);
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
