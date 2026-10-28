import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService, CatalogoItem } from '../../../core/services/carrito.service';
import { ProductoService } from '../../../core/services/producto.service';
import { UploadService } from '../../../core/services/upload.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { BloqueHorario } from '../../../core/models/reserva.model';
import { SucursalService } from '../../../core/services/sucursal.service';
import { BranchSelectionService } from '../../../core/services/branch-selection.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { Sucursal } from '../../../core/models/sucursal.model';
import { ResenaProductoItem, ResenaProductoService, ResenasProductoResponse } from '../../../core/services/resena-producto.service';
import { OfflineStateService } from '../../../core/services/offline-state.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './producto-detalle.component.html',
  styleUrls: ['./producto-detalle.component.css'],
})
export class ProductoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private carritoService = inject(CarritoService);
  private productoService = inject(ProductoService);
  private uploadService = inject(UploadService);
  private reservaService = inject(ReservaService);
  private sucursalService = inject(SucursalService);
  private notificacionesService = inject(NotificacionesService);
  private resenaProductoService = inject(ResenaProductoService);
  public branchService = inject(BranchSelectionService);
  private cdr = inject(ChangeDetectorRef);
  readonly offlineState = inject(OfflineStateService);

  // Estados reactivos con Signals para compatibilidad total con Angular 21
  codigoState = signal<string>('');
  productoData = signal<CatalogoItem | null>(null);
  recomendacionesList = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  isLoadingRecomendaciones = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Filtro de sucursal para consultar existencias reales
  sucursalFiltroId = signal<number | null>(null);

  // Regla de Elegibilidad para Reservas (Punto 3)
  puedeReservar = signal<boolean>(false);
  comprasPrevias = signal<number>(0);
  elegibilidadMensaje = signal<string>('');

  // Fechas límite de Reserva (Máx 7 días)
  minFechaReserva = '';
  maxFechaReserva = '';
  fechaLimiteReserva = '';
  horaRetiroReserva = '';
  bloquesReserva = signal<BloqueHorario[]>([]);
  cargandoBloques = signal(false);
  bloquesReservaProvisionales = signal(false);

  // Selección de variantes
  varianteColor = signal<any>(null);
  existencia = signal<any>(null);
  cantidadValue = signal<number>(1);
  isAgregando = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  // Modal de Reserva por Sucursal
  isReservaModalOpen = signal<boolean>(false);
  isProcesandoReserva = signal<boolean>(false);
  sucursalReservaId = signal<number>(0);
  sucursalesList = signal<Sucursal[]>([]);
  reservaExitosa = signal<any>(null);

  // Reseñas públicas de la prenda
  resenasData = signal<ResenasProductoResponse | null>(null);
  cargandoResenas = signal(true);
  guardandoResena = signal(false);
  eliminandoResena = signal(false);
  errorResenas = signal<string | null>(null);
  puntuacionResena = signal(0);
  puntuacionHover = signal(0);
  comentarioResena = signal('');
  filtroResenas = signal<'todas' | 'verificadas' | 'interes'>('todas');
  readonly estrellas = [1, 2, 3, 4, 5];

  getNombreSucursalSeleccionada(): string {
    const id = this.sucursalFiltroId();
    if (!id) return 'Todas las sucursales';
    const s = this.sucursalesList().find((suc) => suc.id === id);
    return s ? `${s.nombre} (${s.ciudad})` : 'Sucursal seleccionada';
  }

  onSucursalFiltroChange(sucId: any): void {
    const parsedId = sucId ? Number(sucId) : null;
    this.sucursalFiltroId.set(parsedId);
    this.branchService.setBranch(parsedId || 'all', this.sucursalesList());
    this.cargarProducto(this.codigoState(), parsedId);
  }

  // Getters para enlace transparente con la plantilla HTML
  get codigo(): string { return this.codigoState(); }
  get producto(): CatalogoItem | null { return this.productoData(); }
  get recomendaciones(): any[] { return this.recomendacionesList(); }
  get loading(): boolean { return this.isLoading(); }
  get loadingRecomendaciones(): boolean { return this.isLoadingRecomendaciones(); }
  get error(): string | null { return this.errorMessage(); }
  get varianteColorSeleccionada(): any { return this.varianteColor(); }
  get existenciaSeleccionada(): any { return this.existencia(); }
  get cantidad(): number { return this.cantidadValue(); }
  get agregando(): boolean { return this.isAgregando(); }
  get mensajeToast(): string | null { return this.toastMessage(); }
  get precioSeleccionado(): number {
    return Number(
      this.existencia()?.precio
      ?? this.productoData()?.precio_descuento
      ?? this.productoData()?.precio
      ?? 0
    );
  }

  get precioOriginalSeleccionado(): number {
    return Number(this.existencia()?.precio_original ?? this.productoData()?.precio ?? 0);
  }

  get tienePrecioDiferentePorTalla(): boolean {
    const product = this.productoData();
    const existence = this.existencia();
    return !!existence && Number(existence.precio_original ?? product?.precio) !== Number(product?.precio ?? 0);
  }

  get resenasFiltradas(): ResenaProductoItem[] {
    const reviews = this.resenasData()?.resenas || [];
    if (this.filtroResenas() === 'verificadas') return reviews.filter((item) => item.compra_verificada);
    if (this.filtroResenas() === 'interes') return reviews.filter((item) => !item.compra_verificada);
    return reviews;
  }

  get limiteComentarioRestante(): number {
    return 1200 - this.comentarioResena().length;
  }

  porcentajeEstrella(score: number): number {
    const total = this.resenasData()?.resumen.total || 0;
    const value = this.resenasData()?.resumen.distribucion?.[score] || 0;
    return total ? Math.round((value / total) * 100) : 0;
  }

  etiquetaPuntuacion(score: number): string {
    return ['', 'No cumplió mis expectativas', 'Puede mejorar', 'Buena prenda', 'Muy buena elección', 'Me encantó'][score] || 'Elige una puntuación';
  }

  get medidasSeleccionadas(): Array<{ nombre: string; valor: number }> {
    const medidas = this.existencia()?.medidas || {};
    return Object.entries(medidas).map(([nombre, valor]) => ({ nombre: nombre.replaceAll('_', ' '), valor: Number(valor) }));
  }

  ngOnInit(): void {
    const hoy = new Date();
    this.minFechaReserva = hoy.toISOString().split('T')[0];
    const max = new Date();
    max.setDate(max.getDate() + 3);
    this.maxFechaReserva = max.toISOString().split('T')[0];
    this.fechaLimiteReserva = this.maxFechaReserva;

    // Adoptar la sucursal activa previamente seleccionada en el catálogo
    const currentBranchId = this.branchService.selectedBranchId();
    if (currentBranchId) {
      this.sucursalFiltroId.set(currentBranchId);
    }

    // 1. Lectura inmediata desde el snapshot de la ruta
    const initialCod = this.route.snapshot.paramMap.get('codigo') || this.route.snapshot.params['codigo'];
    if (initialCod) {
      this.codigoState.set(initialCod);
      this.cargarProducto(initialCod, currentBranchId);
    }

    this.cargarSucursales();
    this.verificarElegibilidadReserva();

    // 2. Suscripción continua a cambios de navegación
    this.route.paramMap.subscribe((params) => {
      const cod = params.get('codigo');
      if (cod && cod !== this.codigoState()) {
        this.codigoState.set(cod);
        this.cargarProducto(cod, this.sucursalFiltroId());
      } else if (!cod && !this.codigoState()) {
        this.isLoading.set(false);
        this.errorMessage.set('No se ha especificado el código de la prenda.');
        this.cdr.markForCheck();
      }
    });
  }

  volver(): void {
    this.location.back();
  }

  verificarElegibilidadReserva(): void {
    this.reservaService.checkElegibilidad().subscribe({
      next: (res) => {
        this.puedeReservar.set(res.puede_reservar);
        this.comprasPrevias.set(res.compras_previas);
        this.elegibilidadMensaje.set(res.mensaje);
        this.cdr.markForCheck();
      },
      error: () => {
        this.puedeReservar.set(true);
        this.elegibilidadMensaje.set('Puedes reservar; el horario y el stock se validarán al sincronizar.');
        this.cdr.markForCheck();
      },
    });
  }

  suscribirAvisoStock(): void {
    const ex = this.existencia();
    if (!ex || !ex.stock_inventario_id) {
      this.mostrarToast('Selecciona el color y talla para avisarte cuando haya stock.');
      return;
    }
    this.notificacionesService.suscribirStock(ex.stock_inventario_id).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || '¡Te avisaremos en cuanto repongamos stock!');
      },
      error: () => {
        this.mostrarToast('No se pudo registrar la suscripción de alerta de stock.');
      },
    });
  }

  cargarSucursales(): void {
    this.sucursalService.getSucursales(true).subscribe({
      next: (data) => {
        this.sucursalesList.set(data);
      },
    });
  }

  cargarProducto(codigo: string, sucursalId?: number | null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.productoData.set(null);
    this.cdr.markForCheck();

    const targetSuc = sucursalId !== undefined ? sucursalId : this.sucursalFiltroId();

    this.carritoService.getProductoDetalle(codigo, targetSuc || undefined).subscribe({
      next: (data) => {
        this.procesarProductoCargado(data, codigo);
      },
      error: (err) => {
        console.warn('Fallo en getProductoDetalle, intentando fallback a ProductoService:', err);
        // Fallback defensivo a ProductoService si /catalogo tuvo algún problema
        this.productoService.getProducto(codigo).subscribe({
          next: (p) => {
            const fallbackItem: CatalogoItem = {
              codigo: p.codigo,
              nombre: p.nombre,
              descripcion: p.descripcion || undefined,
              foto: p.foto || undefined,
              precio: p.precio,
              categoria_id: p.categoria_id,
              categoria_nombre: p.categoria_nombre || undefined,
              temporada_id: p.temporada_id,
              temporada_nombre: p.temporada_nombre || undefined,
              coleccion_id: p.coleccion_id || undefined,
              coleccion_nombre: p.coleccion_nombre || undefined,
              variantes: p.colores?.map((c) => ({
                producto_color_id: c.id,
                color_id: c.id,
                color_nombre: c.nombre,
                color_hex: undefined,
                existencias: [],
              })) || [
                {
                  producto_color_id: 0,
                  color_id: 0,
                  color_nombre: 'Estándar',
                  color_hex: '#14263D',
                  existencias: [],
                },
              ],
              stock_total: p.stock_total || 0,
            };
            this.procesarProductoCargado(fallbackItem, codigo);
          },
          error: (errFallback) => {
            this.errorMessage.set(
              errFallback?.error?.detail || err?.error?.detail || 'No se pudo cargar la información de la prenda.'
            );
            this.isLoading.set(false);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  private procesarProductoCargado(data: CatalogoItem, codigo: string): void {
    this.productoData.set(data);
    this.isLoading.set(false);

    // Seleccionar automáticamente primer color y talla
    if (data.variantes && data.variantes.length > 0) {
      this.seleccionarColor(data.variantes[0]);
    } else {
      this.varianteColor.set(null);
      this.existencia.set(null);
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // Cargar recomendaciones de IA local
    this.cargarRecomendaciones(codigo);
    this.cargarResenas(codigo);
  }

  cargarResenas(codigo = this.codigoState()): void {
    if (!codigo) return;
    this.cargandoResenas.set(true);
    this.errorResenas.set(null);
    this.resenaProductoService.getByProduct(codigo).subscribe({
      next: (response) => {
        this.aplicarResenas(response);
        this.cargandoResenas.set(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cargandoResenas.set(false);
        this.errorResenas.set(error?.error?.detail || 'No pudimos cargar las opiniones. Intenta nuevamente.');
        this.cdr.markForCheck();
      },
    });
  }

  private aplicarResenas(response: ResenasProductoResponse): void {
    this.resenasData.set(response);
    if (response.mi_resena) {
      this.puntuacionResena.set(response.mi_resena.puntuacion);
      this.comentarioResena.set(response.mi_resena.comentario);
    } else {
      this.puntuacionResena.set(0);
      this.comentarioResena.set('');
    }
  }

  seleccionarPuntuacion(score: number): void {
    this.puntuacionResena.set(score);
  }

  actualizarComentario(value: string): void {
    this.comentarioResena.set(value.slice(0, 1200));
  }

  guardarResena(): void {
    const score = this.puntuacionResena();
    const comment = this.comentarioResena().trim();
    if (score < 1) {
      this.mostrarToast('Selecciona de 1 a 5 estrellas para compartir tu opinión.');
      return;
    }
    if (comment.length < 4) {
      this.mostrarToast('Cuéntanos un poco más sobre esta prenda.');
      return;
    }
    this.guardandoResena.set(true);
    this.resenaProductoService.saveMine(this.codigoState(), score, comment).subscribe({
      next: (response) => {
        this.aplicarResenas(response);
        this.guardandoResena.set(false);
        this.mostrarToast(response.mi_resena?.compra_verificada ? 'Tu reseña verificada ya está publicada.' : 'Tu opinión ya ayuda a otros clientes.');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.guardandoResena.set(false);
        this.mostrarToast(error?.error?.detail || 'No pudimos publicar tu reseña.');
        this.cdr.markForCheck();
      },
    });
  }

  eliminarMiResena(): void {
    if (!this.resenasData()?.mi_resena || this.eliminandoResena()) return;
    this.eliminandoResena.set(true);
    this.resenaProductoService.deleteMine(this.codigoState()).subscribe({
      next: (response) => {
        this.aplicarResenas(response);
        this.eliminandoResena.set(false);
        this.mostrarToast('Tu reseña fue retirada.');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.eliminandoResena.set(false);
        this.mostrarToast(error?.error?.detail || 'No pudimos retirar tu reseña.');
        this.cdr.markForCheck();
      },
    });
  }

  iniciales(nombre: string): string {
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
  }

  cargarRecomendaciones(codigo: string): void {
    this.isLoadingRecomendaciones.set(true);
    this.cdr.markForCheck();

    this.carritoService.getRecomendadosIA(codigo, 4).subscribe({
      next: (recs) => {
        this.recomendacionesList.set(recs || []);
        this.isLoadingRecomendaciones.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.recomendacionesList.set([]);
        this.isLoadingRecomendaciones.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  seleccionarColor(variante: any): void {
    this.varianteColor.set(variante);
    if (variante?.existencias && variante.existencias.length > 0) {
      const sucId = this.sucursalFiltroId();
      let elegida: any = null;
      if (sucId) {
        elegida = variante.existencias.find((e: any) => e.sucursal_id === sucId && e.cantidad > 0)
               || variante.existencias.find((e: any) => e.sucursal_id === sucId);
      }
      if (!elegida) {
        elegida = variante.existencias.find((e: any) => e.cantidad > 0) || variante.existencias[0];
      }
      this.existencia.set(elegida);
      if (elegida && elegida.sucursal_id) {
        this.branchService.setBranch(elegida.sucursal_id, this.sucursalesList());
      }
    } else {
      this.existencia.set(null);
    }
    this.cantidadValue.set(1);
    this.cdr.markForCheck();
  }

  seleccionarTalla(existenciaItem: any): void {
    this.existencia.set(existenciaItem);
    if (existenciaItem && existenciaItem.sucursal_id) {
      this.branchService.setBranch(existenciaItem.sucursal_id, this.sucursalesList());
    }
    this.cantidadValue.set(1);
    this.cdr.markForCheck();
  }

  incrementar(): void {
    const maxStock = this.existencia()?.cantidad || 1;
    if (this.cantidadValue() < maxStock) {
      this.cantidadValue.update((c) => c + 1);
      this.cdr.markForCheck();
    }
  }

  decrementar(): void {
    if (this.cantidadValue() > 1) {
      this.cantidadValue.update((c) => c - 1);
      this.cdr.markForCheck();
    }
  }

  vistaFoto = signal<'frontal' | 'trasera'>('frontal');

  getFotoActual(): string | undefined | null {
    const prod = this.productoData();
    if (this.vistaFoto() === 'trasera' && prod?.foto_trasera) {
      return prod.foto_trasera;
    }
    return prod?.foto;
  }

  setVistaFoto(vista: 'frontal' | 'trasera'): void {
    this.vistaFoto.set(vista);
    this.cdr.markForCheck();
  }

  getImageUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'productos') || 'assets/images/placeholder.jpg';
  }

  mostrarToast(msg: string): void {
    this.toastMessage.set(msg);
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastMessage.set(null);
      this.cdr.markForCheck();
    }, 3500);
  }

  agregarAlCarrito(redirigirAlCheckout: boolean = false): void {
    const ex = this.existencia();
    if (!ex) {
      this.mostrarToast('Por favor selecciona un color y talla disponible con existencias.');
      return;
    }

    if (ex.cantidad <= 0) {
      this.mostrarToast('No hay existencias disponibles para esta variante.');
      return;
    }

    // Sincronizar sucursal de donde se extrae la prenda físicamente
    if (ex.sucursal_id) {
      this.branchService.setBranch(ex.sucursal_id, this.sucursalesList());
    }

    this.isAgregando.set(true);
    this.cdr.markForCheck();

    this.carritoService.addItem(ex.stock_inventario_id, this.cantidadValue()).subscribe({
      next: () => {
        this.isAgregando.set(false);
        this.cdr.markForCheck();
        if (redirigirAlCheckout) {
          this.router.navigate(['/carrito']);
        } else {
          this.mostrarToast(`¡${this.productoData()?.nombre} añadido a la bolsa de compras!`);
        }
      },
      error: () => {
        this.isAgregando.set(false);
        this.cdr.markForCheck();
        this.mostrarToast('Error al agregar la prenda al carrito.');
      },
    });
  }

  navegarAProducto(codigo: string): void {
    this.codigoState.set(codigo);
    this.cargarProducto(codigo);
    this.router.navigate(['/catalogo/producto', codigo]);
  }

  // ==========================================
  // GESTIÓN DE RESERVAS INDICANDO SUCURSAL
  // ==========================================
  abrirModalReserva(): void {
    const ex = this.existencia();
    if (!ex) {
      this.mostrarToast('Por favor selecciona un color y talla disponible antes de reservar.');
      return;
    }

    if (ex.cantidad <= 0) {
      this.mostrarToast('No hay existencias disponibles para reservar esta variante.');
      return;
    }

    // Preseleccionar sucursal:
    // 1) Si la existencia seleccionada ya tiene una sucursal_id, usar esa
    // 2) Si el cliente tenía una sucursal activa en BranchSelectionService, usar esa
    // 3) Si no, la primera sucursal disponible
    let targetSucursalId = ex.sucursal_id;
    if (!targetSucursalId && this.branchService.selectedSucursal()) {
      targetSucursalId = this.branchService.selectedSucursal()!.id;
    }
    if (!targetSucursalId && this.sucursalesList().length > 0) {
      targetSucursalId = this.sucursalesList()[0].id;
    }

    this.sucursalReservaId.set(targetSucursalId || 1);
    this.actualizarHorarioReserva(targetSucursalId || 1);
    this.reservaExitosa.set(null);
    this.isReservaModalOpen.set(true);
    this.cdr.markForCheck();
  }

  actualizarHorarioReserva(sucursalId: number | string): void {
    const id = Number(sucursalId);
    this.sucursalReservaId.set(id);
    this.horaRetiroReserva = '';
    this.cargarBloquesReserva();
  }

  actualizarFechaReserva(fecha: string): void {
    this.fechaLimiteReserva = fecha;
    this.horaRetiroReserva = '';
    this.cargarBloquesReserva();
  }

  cargarBloquesReserva(): void {
    const sucursalId = this.sucursalReservaId();
    if (!sucursalId || !this.fechaLimiteReserva) {
      this.bloquesReserva.set([]);
      return;
    }
    if (!this.offlineState.online()) {
      this.usarBloquesReservaProvisionales();
      return;
    }
    this.cargandoBloques.set(true);
    this.reservaService.getDisponibilidad(sucursalId, this.fechaLimiteReserva).subscribe({
      next: (response) => {
        this.bloquesReserva.set(response.bloques);
        this.bloquesReservaProvisionales.set(false);
        this.horaRetiroReserva = response.bloques.find((block) => block.disponible)?.inicio || '';
        this.cargandoBloques.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err?.status === 0 || !navigator.onLine) {
          this.usarBloquesReservaProvisionales();
        } else {
          this.bloquesReserva.set([]);
          this.horaRetiroReserva = '';
          this.cargandoBloques.set(false);
          this.mostrarToast(err?.error?.detail || 'No se pudo consultar la disponibilidad horaria.');
          this.cdr.markForCheck();
        }
      },
    });
  }

  private usarBloquesReservaProvisionales(): void {
    const branch = this.sucursalReservaSeleccionada;
    const parse = (value: string | undefined, fallback: number): number => {
      const [hour, minute] = (value || '').split(':').map(Number);
      return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : fallback;
    };
    const format = (minutes: number): string =>
      `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    const start = parse(branch?.hora_apertura, 9 * 60);
    const end = parse(branch?.hora_cierre, 18 * 60);
    const blocks: BloqueHorario[] = [];
    for (let current = start; current + 60 <= end; current += 60) {
      blocks.push({ inicio: format(current), fin: format(current + 60), disponible: true });
    }
    this.bloquesReserva.set(blocks);
    this.horaRetiroReserva = blocks[0]?.inicio || '';
    this.bloquesReservaProvisionales.set(true);
    this.cargandoBloques.set(false);
    this.cdr.markForCheck();
  }

  get sucursalReservaSeleccionada(): Sucursal | undefined {
    return this.sucursalesList().find((item) => item.id === this.sucursalReservaId());
  }

  cerrarModalReserva(): void {
    this.isReservaModalOpen.set(false);
    this.reservaExitosa.set(null);
    this.cdr.markForCheck();
  }

  confirmarReserva(): void {
    const ex = this.existencia();
    if (!ex) {
      this.mostrarToast('No se ha podido identificar el inventario de la prenda.');
      return;
    }

    const sucId = this.sucursalReservaId();
    if (!sucId) {
      this.mostrarToast('Por favor selecciona la sucursal donde recogerás tu reserva.');
      return;
    }
    if (!this.fechaLimiteReserva || !this.horaRetiroReserva) {
      this.mostrarToast('Selecciona la fecha y hora en que recogerás tu reserva.');
      return;
    }

    this.isProcesandoReserva.set(true);
    this.cdr.markForCheck();

    // Crear la reserva atómica en backend indicando explícitamente la sucursal seleccionada
    this.reservaService
      .createReserva({
        sucursal_id: sucId,
        fecha_limite: this.fechaLimiteReserva || undefined,
        hora_retiro: this.horaRetiroReserva,
        items: [
          {
            stock_inventario_id: ex.stock_inventario_id,
            cantidad: this.cantidadValue(),
          },
        ],
      })
      .subscribe({
        next: (reserva) => {
          this.isProcesandoReserva.set(false);
          this.reservaExitosa.set(reserva);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isProcesandoReserva.set(false);
          const detail = err?.error?.detail || 'Error al procesar la reserva en la sucursal seleccionada.';
          this.mostrarToast(detail);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  irAMisReservas(): void {
    this.cerrarModalReserva();
    this.router.navigate(['/cuenta/mis-reservas']);
  }
}
