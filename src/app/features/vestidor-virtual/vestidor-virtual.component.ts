import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { CarritoService, CatalogoItem } from '../../core/services/carrito.service';
import { UploadService } from '../../core/services/upload.service';
import { Producto } from '../../core/models/producto.model';

declare global {
  interface Window {
    Pose?: any;
    Camera?: any;
  }
}

@Component({
  selector: 'app-vestidor-virtual',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vestidor-virtual.component.html',
  styleUrls: ['./vestidor-virtual.component.css'],
})
export class VestidorVirtualComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('arCanvas') arCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('photoInput') photoInputRef!: ElementRef<HTMLInputElement>;

  private productoService = inject(ProductoService);
  private carritoService = inject(CarritoService);
  public uploadService = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Estados de Cámara e IA
  isCameraRunning = signal<boolean>(false);
  isCameraLoading = signal<boolean>(false);
  isPoseEngineReady = signal<boolean>(false);
  cameraError = signal<string>('');
  isUserDetected = signal<boolean>(false);
  facingMode = signal<'user' | 'environment'>('user');

  // Modo: 'camara' o 'foto_estatica'
  tryonMode = signal<'camara' | 'foto'>('camara');
  staticPhotoUrl = signal<string>('');
  staticPhotoElement: HTMLImageElement | null = null;

  // Catálogo y Filtros
  catalogItems = signal<Producto[]>([]);
  catalogoDetallado = signal<CatalogoItem[]>([]);
  isLoadingCatalog = signal<boolean>(true);
  categoryFilter = signal<'all' | 'superior' | 'inferior' | 'cuerpo_entero'>('all');
  searchQuery = signal<string>('');

  // Prendas Activas en el Probador (Mix & Match)
  activeTop = signal<Producto | null>(null);
  activeBottom = signal<Producto | null>(null);
  activeDress = signal<Producto | null>(null);

  // Vista Frente / Espalda
  viewMode = signal<'auto' | 'front' | 'back'>('auto');
  isBackDetected = signal<boolean>(false);

  // Calibración y Ajustes Finos
  isMirrorMode = signal<boolean>(true);
  scaleMultiplier = signal<number>(1.0);
  verticalOffset = signal<number>(0);
  opacityLevel = signal<number>(1.0);
  showSettingsPanel = signal<boolean>(false);

  // Snapshot / Captura
  snapshotUrl = signal<string>('');
  showSnapshotModal = signal<boolean>(false);

  // Carrito y Notificaciones
  isAddingToCart = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  // Instancias de MediaPipe
  private pose: any = null;
  private camera: any = null;
  private isProcessingFrame = false;
  private imageCache = new Map<string, HTMLImageElement>();
  private animationFrameId: number | null = null;

  // Total acumulado del look
  totalLookPrice = computed(() => {
    let total = 0;
    if (this.activeDress()) {
      total += Number(this.activeDress()?.precio || 0);
    } else {
      if (this.activeTop()) total += Number(this.activeTop()?.precio || 0);
      if (this.activeBottom()) total += Number(this.activeBottom()?.precio || 0);
    }
    return total;
  });

  filteredProducts = computed(() => {
    const list = this.catalogItems();
    const filter = this.categoryFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter((p) => {
      // Solo prendas con fotos y visibles
      if (!p.active || p.visible_en_catalogo === false) return false;
      const matchesFilter =
        filter === 'all' ? true : (p.tipo_prenda || 'superior') === filter;
      const matchesQuery = query
        ? p.nombre.toLowerCase().includes(query) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
          p.codigo.toLowerCase().includes(query)
        : true;
      return matchesFilter && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.loadCatalog();
    this.loadMediaPipeAndStartCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // 1. CARGA DE CATÁLOGO Y PRENDA INICIAL SI VIENE POR QUERY PARAMS
  private loadCatalog(): void {
    this.isLoadingCatalog.set(true);

    // Cargar productos simples
    this.productoService.getProductos({ active_only: true }).subscribe({
      next: (prods: Producto[]) => {
        this.catalogItems.set(prods);
        this.isLoadingCatalog.set(false);

        // Si viene query param ?producto=PROD-XXXX equiparlo inmediatamente
        const targetCodigo = this.route.snapshot.queryParamMap.get('producto');
        if (targetCodigo) {
          const found = prods.find((p: Producto) => p.codigo === targetCodigo);
          if (found) {
            this.equipProduct(found);
          }
        }
      },
      error: () => this.isLoadingCatalog.set(false),
    });

    // Cargar catálogo detallado para existencias de carrito
    this.carritoService.getCatalogo().subscribe({
      next: (data) => this.catalogoDetallado.set(data),
      error: () => {},
    });
  }

  // 2. INICIALIZACIÓN DE MEDIAPIPE Y CÁMARA
  private async loadMediaPipeAndStartCamera(): Promise<void> {
    this.isCameraLoading.set(true);
    this.cameraError.set('');

    try {
      await this.injectMediaPipeScripts();
      this.initPoseDetector();
      await this.startCamera();
      this.isPoseEngineReady.set(true);
      this.isCameraLoading.set(false);
    } catch (err: any) {
      console.error('Error starting Virtual Fitting Room:', err);
      this.isCameraLoading.set(false);
      this.cameraError.set(
        'No se pudo acceder a la cámara o cargar la IA. Puedes subir una foto o verificar los permisos del navegador.'
      );
    }
  }

  private injectMediaPipeScripts(): Promise<void> {
    if (window.Pose && window.Camera) return Promise.resolve();

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.body.appendChild(script);
      });
    };

    return loadScript(
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
    ).then(() =>
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')
    );
  }

  private initPoseDetector(): void {
    if (!window.Pose) return;

    this.pose = new window.Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults((results: any) => this.onPoseResults(results));
  }

  async startCamera(): Promise<void> {
    if (!this.videoRef?.nativeElement) return;
    const video = this.videoRef.nativeElement;

    if (this.camera) {
      this.camera.stop();
    }

    try {
      const constraints = {
        video: {
          facingMode: this.facingMode(),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      this.isCameraRunning.set(true);
      this.cameraError.set('');

      // Iniciar bucle de procesamiento continuo
      this.processVideoFrames();
    } catch (err: any) {
      console.warn('getUserMedia direct call failed, fallback to CameraUtils:', err);
      // Fallback con CameraUtils de MediaPipe
      this.camera = new window.Camera(video, {
        onFrame: async () => {
          if (this.isCameraRunning() && !this.isProcessingFrame && this.pose) {
            this.isProcessingFrame = true;
            try {
              await this.pose.send({ image: video });
            } finally {
              this.isProcessingFrame = false;
            }
          }
        },
        width: 640,
        height: 480,
      });
      await this.camera.start();
      this.isCameraRunning.set(true);
    }
  }

  private processVideoFrames = async () => {
    if (!this.isCameraRunning()) return;

    const video = this.videoRef?.nativeElement;
    if (video && video.readyState >= 2 && !this.isProcessingFrame && this.pose) {
      this.isProcessingFrame = true;
      try {
        await this.pose.send({ image: video });
      } catch (err) {
        console.warn('Frame processing warn:', err);
      } finally {
        this.isProcessingFrame = false;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processVideoFrames);
  };

  stopCamera(): void {
    this.isCameraRunning.set(false);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.camera) {
      try {
        this.camera.stop();
      } catch {}
    }
    const video = this.videoRef?.nativeElement;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  }

  toggleCameraFacing(): void {
    this.facingMode.set(this.facingMode() === 'user' ? 'environment' : 'user');
    // Si es cámara trasera, desactivar modo espejo por defecto
    if (this.facingMode() === 'environment') {
      this.isMirrorMode.set(false);
    } else {
      this.isMirrorMode.set(true);
    }
    this.startCamera();
  }

  // 3. RENDERIZADO DE RESULTADOS POSE SOBRE CANVAS
  private onPoseResults(results: any): void {
    const canvas = this.arCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = this.videoRef?.nativeElement;
    const width = video?.videoWidth || 640;
    const height = video?.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const landmarks = results.poseLandmarks;
    if (!landmarks || landmarks.length === 0) {
      this.isUserDetected.set(false);
      return;
    }
    this.isUserDetected.set(true);

    // Puntos anatómicos con conversión a píxeles y soporte de espejo
    const isMirror = this.isMirrorMode();
    const getPt = (idx: number) => {
      const p = landmarks[idx];
      const px = isMirror ? (1 - p.x) * width : p.x * width;
      const py = p.y * height;
      return { x: px, y: py, z: p.z || 0, visibility: p.visibility ?? 1 };
    };

    const nose = getPt(0);
    const leftEye = getPt(2);
    const rightEye = getPt(5);
    const leftShoulder = getPt(11);
    const rightShoulder = getPt(12);
    const leftHip = getPt(23);
    const rightHip = getPt(24);
    const leftKnee = getPt(25);
    const rightKnee = getPt(26);

    // Detección Frente vs Espalda
    if (this.viewMode() === 'auto') {
      const faceVis = (leftEye.visibility + rightEye.visibility + nose.visibility) / 3;
      // Si los ojos y nariz son poco visibles o están detrás del plano del hombro
      const isBack = faceVis < 0.45;
      this.isBackDetected.set(isBack);
    } else {
      this.isBackDetected.set(this.viewMode() === 'back');
    }

    // Dibujar Prendas Equipadas
    // 1. Si hay Vestido / Enterizo (Cuerpo Entero)
    if (this.activeDress()) {
      this.drawFullBodyGarment(ctx, this.activeDress()!, leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, width, height);
    } else {
      // 2. Prenda Inferior (Pantalón / Falda) se dibuja primero para que la camisa quede por encima o armónica
      if (this.activeBottom()) {
        this.drawBottomGarment(ctx, this.activeBottom()!, leftHip, rightHip, leftKnee, rightKnee, width, height);
      }
      // 3. Prenda Superior (Camisa / Polera)
      if (this.activeTop()) {
        this.drawTopGarment(ctx, this.activeTop()!, leftShoulder, rightShoulder, leftHip, rightHip, width, height);
      }
    }
  }

  // 4. ALGORITMOS DE ANCLAJE ANATÓMICO POR ZONA

  // Zona Superior: Hombros y Torso
  private drawTopGarment(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    ls: any,
    rs: any,
    lh: any,
    rh: any,
    w: number,
    h: number
  ): void {
    const imgUrl = this.getGarmentImageUrl(product, this.isBackDetected());
    const img = this.getLoadedImage(imgUrl);
    if (!img) return;

    // Centro entre hombros
    const sMidX = (ls.x + rs.x) / 2;
    const sMidY = (ls.y + rs.y) / 2;
    const hMidX = (lh.x + rh.x) / 2;
    const hMidY = (lh.y + rh.y) / 2;

    const shoulderDist = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const angle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

    // Dimensionamiento proporcional
    const scale = this.scaleMultiplier();
    const gWidth = shoulderDist * 2.05 * scale;
    const aspect = (img.naturalHeight || img.height) / (img.naturalWidth || img.width || 1);
    const gHeight = gWidth * aspect;

    // Anclaje: colocado ligeramente por encima de la clavícula
    const anchorX = sMidX;
    const anchorY = sMidY + (this.verticalOffset() * h) / 100;

    ctx.save();
    ctx.globalAlpha = this.opacityLevel();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(angle);

    const collarY = gHeight * 0.16;
    ctx.drawImage(img, -gWidth / 2, -collarY, gWidth, gHeight);
    ctx.restore();
  }

  // Zona Inferior: Caderas y Piernas
  private drawBottomGarment(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    lh: any,
    rh: any,
    lk: any,
    rk: any,
    w: number,
    h: number
  ): void {
    const imgUrl = this.getGarmentImageUrl(product, this.isBackDetected());
    const img = this.getLoadedImage(imgUrl);
    if (!img) return;

    // Centro entre caderas
    const hMidX = (lh.x + rh.x) / 2;
    const hMidY = (lh.y + rh.y) / 2;
    const hipDist = Math.hypot(rh.x - lh.x, rh.y - lh.y);
    const angle = Math.atan2(rh.y - lh.y, rh.x - lh.x);

    const scale = this.scaleMultiplier();
    const gWidth = hipDist * 1.85 * scale;
    const aspect = (img.naturalHeight || img.height) / (img.naturalWidth || img.width || 1);
    const gHeight = gWidth * aspect;

    const anchorX = hMidX;
    const anchorY = hMidY + (this.verticalOffset() * h) / 100;

    ctx.save();
    ctx.globalAlpha = this.opacityLevel();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(angle);

    const waistY = gHeight * 0.08;
    ctx.drawImage(img, -gWidth / 2, -waistY, gWidth, gHeight);
    ctx.restore();
  }

  // Zona Cuerpo Entero: Vestidos y Enterizos
  private drawFullBodyGarment(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    ls: any,
    rs: any,
    lh: any,
    rh: any,
    lk: any,
    rk: any,
    w: number,
    h: number
  ): void {
    const imgUrl = this.getGarmentImageUrl(product, this.isBackDetected());
    const img = this.getLoadedImage(imgUrl);
    if (!img) return;

    const sMidX = (ls.x + rs.x) / 2;
    const sMidY = (ls.y + rs.y) / 2;
    const shoulderDist = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const angle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

    const scale = this.scaleMultiplier();
    const gWidth = shoulderDist * 2.15 * scale;
    const aspect = (img.naturalHeight || img.height) / (img.naturalWidth || img.width || 1);
    const gHeight = gWidth * aspect;

    const anchorX = sMidX;
    const anchorY = sMidY + (this.verticalOffset() * h) / 100;

    ctx.save();
    ctx.globalAlpha = this.opacityLevel();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(angle);

    const collarY = gHeight * 0.12;
    ctx.drawImage(img, -gWidth / 2, -collarY, gWidth, gHeight);
    ctx.restore();
  }

  // 5. GESTIÓN DE FOTOS Y CACHÉ
  getGarmentImageUrl(product: Producto, isBack: boolean): string {
    if (isBack) {
      if (product.foto_vestidor_trasera) return product.foto_vestidor_trasera;
      if (product.foto_trasera) return product.foto_trasera;
      return product.foto_vestidor_frontal || product.foto || '';
    } else {
      return product.foto_vestidor_frontal || product.foto || '';
    }
  }

  private getLoadedImage(url?: string): HTMLImageElement | null {
    if (!url) return null;
    const fullUrl = this.uploadService.getImageUrl(url);
    if (this.imageCache.has(fullUrl)) {
      const img = this.imageCache.get(fullUrl)!;
      return img.complete ? img : null;
    }
    // Si no está en caché, iniciar carga
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = fullUrl;
    this.imageCache.set(fullUrl, img);
    return null;
  }

  // 6. EQUIPAR / DESEQUIPAR PRENDAS
  equipProduct(product: Producto): void {
    const tipo = product.tipo_prenda || 'superior';

    // Precargar imágenes frontal y trasera
    if (product.foto) this.getLoadedImage(product.foto);
    if (product.foto_trasera) this.getLoadedImage(product.foto_trasera);
    if (product.foto_vestidor_frontal) this.getLoadedImage(product.foto_vestidor_frontal);
    if (product.foto_vestidor_trasera) this.getLoadedImage(product.foto_vestidor_trasera);

    if (tipo === 'cuerpo_entero') {
      // Un vestido reemplaza top y bottom
      this.activeTop.set(null);
      this.activeBottom.set(null);
      this.activeDress.set(product);
    } else if (tipo === 'superior') {
      this.activeDress.set(null);
      this.activeTop.set(product);
    } else if (tipo === 'inferior') {
      this.activeDress.set(null);
      this.activeBottom.set(product);
    } else {
      // Accesorio u otro
      this.activeTop.set(product);
    }

    this.showToast(`✨ Te estás probando: ${product.nombre}`);
  }

  unequipProduct(tipo: 'superior' | 'inferior' | 'cuerpo_entero'): void {
    if (tipo === 'superior') this.activeTop.set(null);
    if (tipo === 'inferior') this.activeBottom.set(null);
    if (tipo === 'cuerpo_entero') this.activeDress.set(null);
  }

  isEquipped(product: Producto): boolean {
    return (
      this.activeTop()?.codigo === product.codigo ||
      this.activeBottom()?.codigo === product.codigo ||
      this.activeDress()?.codigo === product.codigo
    );
  }

  // 7. MODO ALTERNATIVO: PROBAR CON FOTO SUBIDA
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      this.staticPhotoUrl.set(e.target?.result as string);
      this.tryonMode.set('foto');
      this.stopCamera();

      // Cargar imagen en elemento
      const img = new Image();
      img.onload = async () => {
        this.staticPhotoElement = img;
        if (this.pose) {
          await this.pose.send({ image: img });
        }
      };
      img.src = this.staticPhotoUrl();
    };
    reader.readAsDataURL(file);
  }

  switchToCamera(): void {
    this.tryonMode.set('camara');
    this.staticPhotoUrl.set('');
    this.staticPhotoElement = null;
    this.startCamera();
  }

  // 8. CAPTURA DE PANTALLA / LOOK SNAPSHOT
  takeSnapshot(): void {
    const video = this.videoRef?.nativeElement;
    const arCanvas = this.arCanvasRef?.nativeElement;
    if (!video || !arCanvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = width;
    snapCanvas.height = height;
    const ctx = snapCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Dibujar imagen de la cámara (reflejada si está en modo espejo)
    ctx.save();
    if (this.isMirrorMode()) {
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
    }
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Dibujar prendas superpuestas
    ctx.drawImage(arCanvas, 0, 0, width, height);

    // 3. Marca de Agua Luxury StyleStore
    ctx.fillStyle = 'rgba(20, 38, 61, 0.85)';
    ctx.fillRect(0, height - 46, width, 46);
    ctx.fillStyle = '#C8A97E';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('✨ STYLESTORE | VESTIDOR VIRTUAL', 20, height - 18);

    const dateStr = new Date().toLocaleDateString('es-BO');
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, width - 20, height - 18);

    this.snapshotUrl.set(snapCanvas.toDataURL('image/png'));
    this.showSnapshotModal.set(true);
  }

  downloadSnapshot(): void {
    const link = document.createElement('a');
    link.download = `StyleStore-Look-${Date.now()}.png`;
    link.href = this.snapshotUrl();
    link.click();
  }

  // 9. AÑADIR LOOK AL CARRITO
  addLookToCart(): void {
    const itemsToAdd: Producto[] = [];
    if (this.activeDress()) {
      itemsToAdd.push(this.activeDress()!);
    } else {
      if (this.activeTop()) itemsToAdd.push(this.activeTop()!);
      if (this.activeBottom()) itemsToAdd.push(this.activeBottom()!);
    }

    if (itemsToAdd.length === 0) {
      this.showToast('⚠️ No tienes prendas equipadas para añadir al carrito.');
      return;
    }

    this.isAddingToCart.set(true);

    // Buscar existencias de catálogo para obtener stock_inventario_id
    const detailed = this.catalogoDetallado();
    let addedCount = 0;

    itemsToAdd.forEach((p) => {
      const match = detailed.find((d) => d.codigo === p.codigo);
      let stockId: number | null = null;

      if (match && match.variantes && match.variantes.length > 0) {
        for (const v of match.variantes) {
          if (v.existencias && v.existencias.length > 0) {
            const ex = v.existencias.find((e) => e.cantidad > 0) || v.existencias[0];
            stockId = ex.stock_inventario_id;
            break;
          }
        }
      }

      if (stockId) {
        this.carritoService.addItem(stockId, 1).subscribe({
          next: () => {
            addedCount++;
            if (addedCount === itemsToAdd.length) {
              this.isAddingToCart.set(false);
              this.showToast('🛒 ¡Prendas agregadas al carrito con éxito!');
            }
          },
          error: () => {
            this.isAddingToCart.set(false);
          },
        });
      } else {
        // Redirigir al detalle para que elija talla
        this.isAddingToCart.set(false);
        this.router.navigate(['/catalogo/producto', p.codigo]);
      }
    });
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  getImage(url?: string | null): string {
    return this.uploadService.getImageUrl(url);
  }
}
