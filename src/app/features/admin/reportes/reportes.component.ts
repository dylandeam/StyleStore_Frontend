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

  // Catálogo de los 8 Reportes Dinámicos v7
  reportesEspecializados = [
    { id: 'compras', nombre: 'Compras a Proveedores', icon: 'bi-truck', desc: 'Historial de órdenes de compra, costos e inventario recibido' },
    { id: 'financiero', nombre: 'Flujo de Caja y Pagos', icon: 'bi-cash-coin', desc: 'Ingresos por PayPal, Efectivo en mostrador y QR Simple' },
    { id: 'rotacion', nombre: 'Rotación de Inventario', icon: 'bi-arrow-repeat', desc: 'Prendas más vendidas vs menor rotación por sucursal' },
    { id: 'caducidad', nombre: 'Obsolescencia y Temporadas', icon: 'bi-calendar-x', desc: 'Prendas de temporadas pasadas y sugerencias de liquidación' },
    { id: 'empleados', nombre: 'Rendimiento de Vendedores', icon: 'bi-person-badge', desc: 'Ventas generadas por empleado y sucursales activas' },
    { id: 'auditoria', nombre: 'Bitácora y Auditoría', icon: 'bi-shield-check', desc: 'Trazabilidad de modificaciones de stock, cobros y operaciones' },
    { id: 'devoluciones', nombre: 'Garantías y Devoluciones', icon: 'bi-arrow-left-right', desc: 'Historial de cambios de talla, defectos y canjes en caja' },
    { id: 'clientes', nombre: 'Clientes Frecuentes', icon: 'bi-stars', desc: 'Fidelización, volumen de compra y clientes habilitados para reserva' },
  ];

  selectedReporteTipo: string = 'compras';
  selectedReporteSucursalId: number | '' = '';
  cargandoReporteDinamico: boolean = false;
  datosReporteDinamico: { title: string; columns: string[]; data: any[][] } | null = null;

  // ========================================================
  // ASISTENTE DE IA PARA REPORTES Y BÚSQUEDA POR VOZ
  // ========================================================
  preguntaIA: string = '';
  isLoadingIA: boolean = false;
  respuestaIA: string | null = null;
  kpisIA: Array<{ label: string; valor: string }> = [];
  isListeningIA: boolean = false;
  speechSupportedIA: boolean = false;
  private recognitionIA: any = null;
  isModalGuiaOpen: boolean = false;

  // Guía de consultas e instrucciones categorizadas para el modal
  categoriasGuia = [
    {
      categoria: '📊 Ventas y Recaudación',
      icono: 'bi-cash-stack',
      descripcion: 'Consulta ingresos, órdenes y prendas vendidas hoy o acumuladas.',
      preguntas: [
        '¿Cuántas ropas se vendieron hoy? y ¿cuáles son?',
        '¿Cuál es la recaudación total de hoy?',
        '¿Cuánto se ha vendido en total en lo que va del mes?',
        '¿Cuántas órdenes de compra se procesaron hoy?',
      ],
    },
    {
      categoria: '🏢 Sucursales y Tiendas Físicas',
      icono: 'bi-shop',
      descripcion: 'Reportes financieros individualizados por sucursal.',
      preguntas: [
        '¿Cuánto dinero recaudó la sucursal alemana hoy?',
        '¿Cuál es la recaudación de la Sucursal Test este mes?',
        '¿Qué sucursal tiene mayores ingresos registrados?',
        '¿Qué tiendas están activas en el sistema?',
      ],
    },
    {
      categoria: '🚚 Delivery y Despachos en Vivo',
      icono: 'bi-bicycle',
      descripcion: 'Estado de entregas a domicilio, repartidores y tarifas.',
      preguntas: [
        '¿Cuántos pedidos por delivery hubo hoy?',
        '¿Cuántos envíos están en camino y cuántos entregados?',
        '¿Cuánto se cobró por tarifas de delivery hoy?',
        '¿Cuántos pedidos a domicilio se realizaron este mes?',
      ],
    },
    {
      categoria: '⚠️ Inventario y Stock Crítico',
      icono: 'bi-exclamation-triangle',
      descripcion: 'Alertas tempranas de prendas agotadas o con bajo stock.',
      preguntas: [
        '¿Qué prendas tienen bajo stock o están por agotarse?',
        '¿Cuáles son las prendas con 5 o menos unidades en inventario?',
        '¿Hay productos agotados en alguna sucursal?',
      ],
    },
    {
      categoria: '💳 Finanzas y Formas de Pago',
      icono: 'bi-credit-card',
      descripcion: 'Distribución de pagos en Efectivo, QR Simple, Tarjeta y PayPal.',
      preguntas: [
        '¿Cuánto dinero se cobró por efectivo y cuánto por QR hoy?',
        '¿Cuáles son los métodos de pago más utilizados hoy?',
        '¿Hay pagos registrados con PayPal en la fecha actual?',
      ],
    },
  ];

  getNombreReporteSeleccionado(): string {
    const rep = this.reportesEspecializados.find((r) => r.id === this.selectedReporteTipo);
    return rep ? rep.nombre : this.selectedReporteTipo;
  }

  ngOnInit(): void {
    this.cargarSucursales();
    this.initSpeechRecognitionIA();
  }

  initSpeechRecognitionIA(): void {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.speechSupportedIA = true;
      try {
        this.recognitionIA = new SpeechRec();
        this.recognitionIA.lang = 'es-BO';
        this.recognitionIA.continuous = false;
        this.recognitionIA.interimResults = false;

        this.recognitionIA.onstart = () => {
          this.ngZone.run(() => {
            this.isListeningIA = true;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        };

        this.recognitionIA.onresult = (event: any) => {
          this.ngZone.run(() => {
            if (event.results && event.results[0] && event.results[0][0]) {
              const transcripcion = event.results[0][0].transcript;
              if (transcripcion) {
                this.preguntaIA = transcripcion;
                this.isListeningIA = false;
                this.cdr.markForCheck();
                this.cdr.detectChanges();
                this.consultarIA();
              }
            }
          });
        };

        this.recognitionIA.onerror = (err: any) => {
          this.ngZone.run(() => {
            console.warn('SpeechRecognition error en reportes:', err);
            this.isListeningIA = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        };

        this.recognitionIA.onend = () => {
          this.ngZone.run(() => {
            this.isListeningIA = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        };
      } catch (e) {
        console.warn('Error inicializando SpeechRecognition en reportes:', e);
      }
    }
  }

  toggleVoiceSearchIA(): void {
    if (!this.speechSupportedIA || !this.recognitionIA) {
      alert('Tu navegador no tiene activado el soporte de voz nativo. Te sugerimos usar Google Chrome, Microsoft Edge o Safari en iPhone/iPad.');
      return;
    }

    if (this.isListeningIA) {
      try {
        this.recognitionIA.stop();
      } catch (e) {
        console.warn('Error deteniendo voz en reportes:', e);
      }
      this.isListeningIA = false;
    } else {
      try {
        this.recognitionIA.start();
      } catch (e) {
        console.warn('Error iniciando voz en reportes:', e);
        this.isListeningIA = false;
      }
    }
  }

  consultarIA(): void {
    const q = this.preguntaIA.trim();
    if (!q || this.isLoadingIA) return;

    this.isLoadingIA = true;
    this.respuestaIA = null;
    this.kpisIA = [];
    this.cdr.markForCheck();

    this.reportesService.consultarAsistenteIA(q).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.isLoadingIA = false;
          this.respuestaIA = res.respuesta;
          this.kpisIA = res.kpis || [];
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoadingIA = false;
          this.respuestaIA = 'Ocurrió un error al procesar tu consulta con el asistente de IA. Por favor intenta nuevamente.';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
    });
  }

  limpiarConsultaIA(): void {
    this.preguntaIA = '';
    this.respuestaIA = null;
    this.kpisIA = [];
  }

  abrirModalGuia(): void {
    this.isModalGuiaOpen = true;
  }

  cerrarModalGuia(): void {
    this.isModalGuiaOpen = false;
  }

  usarPreguntaSugerida(pregunta: string): void {
    this.preguntaIA = pregunta;
    this.isModalGuiaOpen = false;
    this.consultarIA();
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

  // ==========================================
  // 8 REPORTES ESPECIALIZADOS v6
  // ==========================================

  seleccionarReporte(tipo: string): void {
    this.selectedReporteTipo = tipo;
    this.cargarPreviewReporteDinamico();
  }

  cargarPreviewReporteDinamico(): void {
    this.cargandoReporteDinamico = true;
    this.datosReporteDinamico = null;
    const sucId = this.selectedReporteSucursalId ? Number(this.selectedReporteSucursalId) : undefined;

    this.reportesService.getReportPreview(this.selectedReporteTipo, sucId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.datosReporteDinamico = this.formatearDatosReporte(this.selectedReporteTipo, res);
          this.cargandoReporteDinamico = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.cargandoReporteDinamico = false;
          this.mostrarToast(err.error?.detail || 'Error al obtener reporte especializado.');
          this.cdr.markForCheck();
        });
      },
    });
  }

  private formatearDatosReporte(tipo: string, res: any): { title: string; columns: string[]; data: any[][] } {
    if (res && Array.isArray(res.columns) && Array.isArray(res.data)) {
      return res;
    }
    const nombre = this.getNombreReporteSeleccionado();
    const items = res?.items || (Array.isArray(res) ? res : []);

    if (tipo === 'rotacion' && res?.mas_vendidas) {
      const columns = ['Tipo', 'Prenda', 'Unidades Vendidas', 'Total Recaudado (Bs.)'];
      const data: any[][] = [];
      for (const m of res.mas_vendidas || []) {
        data.push(['TOP VENTA', m.producto, m.unidades_vendidas, `Bs. ${Number(m.total_recaudado).toFixed(2)}`]);
      }
      for (const me of res.menos_vendidas || []) {
        data.push(['BAJA VENTA', me.producto, me.unidades_vendidas, `Bs. ${Number(me.total_recaudado).toFixed(2)}`]);
      }
      return { title: nombre, columns, data };
    }

    if (tipo === 'compras') {
      const columns = ['ID Compra', 'Fecha', 'Proveedor', 'Sucursal', 'Total (Bs.)'];
      const data = items.map((i: any) => [i.id, i.fecha, i.proveedor, i.sucursal, `Bs. ${Number(i.total).toFixed(2)}`]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'financiero') {
      const columns = ['Método de Pago', 'Transacciones Registradas', 'Total Recaudado (Bs.)'];
      const data = items.map((i: any) => [i.metodo, i.cantidad_transacciones, `Bs. ${Number(i.total_recaudado).toFixed(2)}`]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'caducidad') {
      const columns = ['Código', 'Prenda', 'Temporada', 'Sucursal', 'Talla', 'Stock', 'Precio (Bs.)', 'Sugerencia'];
      const data = items.map((i: any) => [i.codigo, i.producto, i.temporada, i.sucursal, i.talla, i.unidades_stock, `Bs. ${Number(i.precio_actual).toFixed(2)}`, i.descuento_sugerido]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'vendedores' || tipo === 'empleados') {
      const columns = ['Código', 'Nombre Empleado', 'Correo', 'Sucursal', 'Teléfono', 'Sueldo (Bs.)'];
      const data = items.map((i: any) => [i.codigo, i.nombre, i.email, i.sucursal, i.telefono, `Bs. ${Number(i.sueldo).toFixed(2)}`]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'auditoria') {
      const columns = ['ID', 'Usuario', 'Módulo', 'Acción', 'IP', 'Fecha y Hora'];
      const data = items.map((i: any) => [i.id, i.usuario, i.modulo, i.accion, i.ip, i.fecha]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'garantias' || tipo === 'devoluciones') {
      const columns = ['ID', 'Ticket Venta', 'Tipo', 'Motivo', 'Prenda', 'Sucursal', 'Estado', 'Fecha Programada'];
      const data = items.map((i: any) => [i.id, i.ticket, i.tipo, i.motivo, i.producto, i.sucursal, i.estado, i.fecha_programada]);
      return { title: nombre, columns, data };
    }

    if (tipo === 'clientes') {
      const columns = ['Código', 'Nombre', 'Correo', 'Teléfono', 'Total Compras', 'Total Gastado (Bs.)'];
      const data = items.map((i: any) => [i.codigo, i.nombre, i.email, i.telefono, i.total_compras, `Bs. ${Number(i.monto_gastado).toFixed(2)}`]);
      return { title: nombre, columns, data };
    }

    if (items.length > 0) {
      const sample = items[0];
      const keys = Object.keys(sample);
      const columns = keys.map((k) => k.replace(/_/g, ' ').toUpperCase());
      const data = items.map((row: any) => keys.map((k) => row[k]));
      return { title: nombre, columns, data };
    }

    return { title: nombre, columns: ['Mensaje'], data: [['No se encontraron datos registrados para este reporte.']] };
  }

  descargarReporteDinamicoExcel(): void {
    this.descargando = true;
    const sucId = this.selectedReporteSucursalId ? Number(this.selectedReporteSucursalId) : undefined;

    this.reportesService.exportarReporteExcel(this.selectedReporteTipo, sucId).subscribe({
      next: (blob) => {
        this.ngZone.run(() => {
          this.descargando = false;
          this.guardarArchivo(blob, `reporte_${this.selectedReporteTipo}.xlsx`);
          this.mostrarToast(`Reporte de ${this.selectedReporteTipo} exportado a Excel.`);
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.descargando = false;
          this.mostrarToast('Error al exportar reporte a Excel.');
          this.cdr.markForCheck();
        });
      },
    });
  }

  descargarReporteDinamicoPDF(): void {
    this.descargando = true;
    const sucId = this.selectedReporteSucursalId ? Number(this.selectedReporteSucursalId) : undefined;

    this.reportesService.exportarReportePDF(this.selectedReporteTipo, sucId).subscribe({
      next: (blob) => {
        this.ngZone.run(() => {
          this.descargando = false;
          this.guardarArchivo(blob, `reporte_${this.selectedReporteTipo}.pdf`);
          this.mostrarToast(`Reporte de ${this.selectedReporteTipo} exportado a PDF.`);
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.descargando = false;
          this.mostrarToast('Error al exportar reporte a PDF.');
          this.cdr.markForCheck();
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

