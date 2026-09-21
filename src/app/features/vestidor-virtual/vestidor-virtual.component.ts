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

  // Vista Frente / Espalda y Orientación 3D
  viewMode = signal<'auto' | 'front' | 'back'>('auto');
  isBackDetected = signal<boolean>(false);
  bodyOrientation = signal<'frente' | 'perfil' | 'espalda'>('frente');
  bodyYawAngle = signal<number>(0);

  // Calibración y Ajustes Finos
  isMirrorMode = signal<boolean>(true);
  scaleMultiplier = signal<number>(1.0);
  verticalOffset = signal<number>(0);
  opacityLevel = signal<number>(1.0);
  showSettingsPanel = signal<boolean>(false);

  // Sensores de Profundidad y Ajuste a la Silueta
  depthSensorDetected = signal<'hardware' | 'neural'>('neural');
  conformalSilhouetteFit = signal<boolean>(true);
  bodyFitTightness = signal<'slim' | 'regular' | 'loose'>('slim');

  // Snapshot / Captura
  snapshotUrl = signal<string>('');
  showSnapshotModal = signal<boolean>(false);

  // Carrito y Notificaciones
  isAddingToCart = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  // Instancias de MediaPipe, Sensor de Profundidad y Filtros Anti-Temblor
  private pose: any = null;
  private camera: any = null;
  private isProcessingFrame = false;
  private imageCache = new Map<string, HTMLImageElement>();
  private animationFrameId: number | null = null;
  private smoothedPoints = new Map<number, { x: number; y: number; z: number }>();
  private backScoreCounter = 0;
  private smoothedYaw = 0;
  private maskCanvas = document.createElement('canvas');
  private maskCtx: CanvasRenderingContext2D | null = null;

  // Física de Inercia de Tela (Dynamic Cloth Spring-Damper)
  private hemClothPhysics = {
    left: { x: 0, y: 0, vx: 0, vy: 0 },
    right: { x: 0, y: 0, vx: 0, vy: 0 },
    center: { x: 0, y: 0, vx: 0, vy: 0 },
    initialized: false,
  };

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

    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

    this.pose = new window.Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
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

    // Detectar si el teléfono/dispositivo tiene hardware ToF / LiDAR / TrueDepth
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasHwDepth = devices.some(
        (d) =>
          d.kind === 'videoinput' &&
          (d.label.toLowerCase().includes('depth') ||
            d.label.toLowerCase().includes('tof') ||
            d.label.toLowerCase().includes('ir') ||
            d.label.toLowerCase().includes('truedepth'))
      );
      this.depthSensorDetected.set(hasHwDepth ? 'hardware' : 'neural');
    } catch {
      this.depthSensorDetected.set('neural');
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

    const isMirror = this.isMirrorMode();

    // 1. CÁLCULO DE ORIENTACIÓN 3D (Frente vs Espalda vs Perfil)
    const rawNose = landmarks[0];
    const rawLe = landmarks[7]; // Oreja Izquierda
    const rawRe = landmarks[8]; // Oreja Derecha
    const rawLs = landmarks[11]; // Hombro Izquierdo
    const rawRs = landmarks[12]; // Hombro Derecho
    const rawLh = landmarks[23]; // Cadera Izquierda
    const rawRh = landmarks[24]; // Cadera Derecha

    // Diferencia de profundidad Z (en MediaPipe Z negativo = más cerca a la cámara)
    const avgShoulderZ = (rawLs.z + rawRs.z) / 2;
    const zDiff = rawNose.z - avgShoulderZ;

    // Vector de hombro derecho a hombro izquierdo en espacio de cámara (apunta a +X de frente)
    const sX = rawLs.x - rawRs.x;
    const sY = rawLs.y - rawRs.y;
    const midShX = (rawLs.x + rawRs.x) / 2;
    const midShY = (rawLs.y + rawRs.y) / 2;
    const midHpX = (rawLh.x + rawRh.x) / 2;
    const midHpY = (rawLh.y + rawRh.y) / 2;
    const tX = midHpX - midShX;
    const tY = midHpY - midShY;
    const normalZ = sX * tY - sY * tX;

    // Ángulo de giro horizontal (Yaw) en grados (0° cuando mira de frente a la cámara)
    const shoulderDx = rawLs.x - rawRs.x;
    const shoulderDz = (rawLs.z - rawRs.z) * 2.5;
    const rawYaw = Math.atan2(shoulderDz, shoulderDx) * (180 / Math.PI);
    this.smoothedYaw = this.smoothedYaw * 0.7 + rawYaw * 0.3;
    this.bodyYawAngle.set(Math.round(this.smoothedYaw));

    // Detección determinista de Espalda
    const isBackByZ = zDiff > 0.04;
    const isBackByEars =
      (rawNose.visibility ?? 1) < 0.35 &&
      ((rawLe?.visibility ?? 0) > 0.45 || (rawRe?.visibility ?? 0) > 0.45);
    const isBackByYaw = Math.abs(this.smoothedYaw) > 105;
    const isBackByNormal = normalZ < -0.05;

    const isBackDetectedFrame = isBackByZ || isBackByEars || isBackByYaw || isBackByNormal;

    if (this.viewMode() === 'auto') {
      if (isBackDetectedFrame) {
        this.backScoreCounter = Math.min(this.backScoreCounter + 1, 8);
      } else {
        this.backScoreCounter = Math.max(this.backScoreCounter - 1, 0);
      }
      this.isBackDetected.set(this.backScoreCounter >= 5);
    } else {
      this.isBackDetected.set(this.viewMode() === 'back');
    }

    const absYaw = Math.abs(this.smoothedYaw);
    if (this.isBackDetected()) {
      this.bodyOrientation.set('espalda');
    } else if (absYaw > 55 && absYaw <= 105) {
      this.bodyOrientation.set('perfil');
    } else {
      this.bodyOrientation.set('frente');
    }

    // 2. EXTRACCIÓN Y SUAVIZADO ANTI-TEMBLOR (EMA) DE LANDMARKS
    const getPt = (idx: number) => {
      const p = landmarks[idx];
      const px = isMirror ? (1 - p.x) * width : p.x * width;
      const py = p.y * height;
      const pz = p.z || 0;

      // Filtro suavizador exponencial para eliminar el temblor de cámara
      const alpha = 0.65;
      const prev = this.smoothedPoints.get(idx);
      let sx = px,
        sy = py,
        sz = pz;
      if (prev) {
        sx = prev.x * (1 - alpha) + px * alpha;
        sy = prev.y * (1 - alpha) + py * alpha;
        sz = prev.z * (1 - alpha) + pz * alpha;
      }
      this.smoothedPoints.set(idx, { x: sx, y: sy, z: sz });
      return { x: sx, y: sy, z: sz, visibility: p.visibility ?? 1 };
    };

    const nose = getPt(0);
    const ls = getPt(11); // Hombro Izquierdo
    const rs = getPt(12); // Hombro Derecho
    const le = getPt(13); // Codo Izquierdo
    const re = getPt(14); // Codo Derecho
    const lw = getPt(15); // Muñeca Izquierda
    const rw = getPt(16); // Muñeca Derecha
    const lh = getPt(23); // Cadera Izquierda
    const rh = getPt(24); // Cadera Derecha
    const lk = getPt(25); // Rodilla Izquierda
    const rk = getPt(26); // Rodilla Derecha
    const la = getPt(27); // Tobillo Izquierdo
    const ra = getPt(28); // Tobillo Derecho

    // 3. FÍSICA DE INERCIA DE TELA EN EL RUEDO (Hem Cloth Sway Physics)
    const midShXSmooth = (ls.x + rs.x) / 2;
    const midShYSmooth = (ls.y + rs.y) / 2;
    const midHpXSmooth = (lh.x + rh.x) / 2;
    const midHpYSmooth = (lh.y + rh.y) / 2;
    const torsoVecY = midHpYSmooth - midShYSmooth;
    const torsoVecX = midHpXSmooth - midShXSmooth;

    const baseHemLX = lh.x + torsoVecX * 0.22;
    const baseHemLY = lh.y + torsoVecY * 0.22;
    const baseHemRX = rh.x + torsoVecX * 0.22;
    const baseHemRY = rh.y + torsoVecY * 0.22;
    const baseHemCX = (baseHemLX + baseHemRX) / 2;
    const baseHemCY = (baseHemLY + baseHemRY) / 2;

    const physics = this.hemClothPhysics;
    if (!physics.initialized) {
      physics.left = { x: baseHemLX, y: baseHemLY, vx: 0, vy: 0 };
      physics.right = { x: baseHemRX, y: baseHemRY, vx: 0, vy: 0 };
      physics.center = { x: baseHemCX, y: baseHemCY, vx: 0, vy: 0 };
      physics.initialized = true;
    } else {
      const springK = 0.26;
      const damping = 0.65;
      // Inercia centro
      const fCX = (baseHemCX - physics.center.x) * springK;
      const fCY = (baseHemCY - physics.center.y) * springK;
      physics.center.vx = physics.center.vx * damping + fCX;
      physics.center.vy = physics.center.vy * damping + fCY;
      physics.center.x += physics.center.vx;
      physics.center.y += physics.center.vy;

      // Inercia izquierda
      const fLX = (baseHemLX - physics.left.x) * springK;
      const fLY = (baseHemLY - physics.left.y) * springK;
      physics.left.vx = physics.left.vx * damping + fLX;
      physics.left.vy = physics.left.vy * damping + fLY;
      physics.left.x += physics.left.vx;
      physics.left.y += physics.left.vy;

      // Inercia derecha
      const fRX = (baseHemRX - physics.right.x) * springK;
      const fRY = (baseHemRY - physics.right.y) * springK;
      physics.right.vx = physics.right.vx * damping + fRX;
      physics.right.vy = physics.right.vy * damping + fRY;
      physics.right.x += physics.right.vx;
      physics.right.y += physics.right.vy;
    }

    // 3.5. ACTUALIZAR MÁSCARA NEURAL DE PROFUNDIDAD Y SILUETA (MediaPipe Neural Depth Mask)
    if (results.segmentationMask && this.maskCtx) {
      const maskW = 160;
      const maskH = 120;
      if (this.maskCanvas.width !== maskW || this.maskCanvas.height !== maskH) {
        this.maskCanvas.width = maskW;
        this.maskCanvas.height = maskH;
      }
      this.maskCtx.save();
      if (isMirror) {
        this.maskCtx.scale(-1, 1);
        this.maskCtx.translate(-maskW, 0);
      }
      this.maskCtx.drawImage(results.segmentationMask, 0, 0, maskW, maskH);
      this.maskCtx.restore();
    }

    // 4. RENDERIZADO POR MALLA ANATÓMICA DEFORMABLE
    ctx.save();
    ctx.globalAlpha = this.opacityLevel();
    // Sombra suave ambiental para realismo e integración con el cuerpo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    if (this.activeDress()) {
      this.drawFullBodyGarmentMesh(
        ctx,
        this.activeDress()!,
        ls,
        rs,
        le,
        re,
        lh,
        rh,
        lk,
        rk,
        width,
        height
      );
    } else {
      if (this.activeBottom()) {
        this.drawBottomGarmentMesh(
          ctx,
          this.activeBottom()!,
          lh,
          rh,
          lk,
          rk,
          la,
          ra,
          width,
          height
        );
      }
      if (this.activeTop()) {
        this.drawTopGarmentMesh(
          ctx,
          this.activeTop()!,
          ls,
          rs,
          le,
          re,
          lh,
          rh,
          width,
          height
        );
      }
    }

    ctx.restore();
  }

  // Lector de Silueta y Límites Físicos por Sensor de Profundidad Neuronal
  private getBodyContourAtY(
    normY: number,
    centerX: number,
    canvasWidth: number,
    expectedWidth: number
  ): { leftX: number; rightX: number; width: number } | null {
    if (!this.maskCtx || !this.conformalSilhouetteFit()) return null;
    const maskW = this.maskCanvas.width;
    const maskH = this.maskCanvas.height;
    if (maskW === 0 || maskH === 0 || expectedWidth <= 0) return null;

    const my = Math.max(0, Math.min(maskH - 1, Math.round(normY * maskH)));
    const cx = Math.max(
      0,
      Math.min(maskW - 1, Math.round((centerX / canvasWidth) * maskW))
    );

    // Búsqueda acotada a la anatomía humana (máximo +/- 65% del ancho esperado)
    const maxSearchRadiusPx = Math.max(
      8,
      Math.round((expectedWidth / canvasWidth) * maskW * 0.65)
    );

    try {
      const row = this.maskCtx.getImageData(0, my, maskW, 1).data;
      let minX = cx;
      let maxX = cx;

      // Buscar borde izquierdo desde el centro del cuerpo hacia afuera
      const leftLimit = Math.max(0, cx - maxSearchRadiusPx);
      for (let x = cx; x >= leftLimit; x--) {
        const val = row[x * 4 + 3] || row[x * 4];
        if (val > 100) {
          minX = x;
        } else if (cx - x > 5) {
          break;
        }
      }

      // Buscar borde derecho desde el centro del cuerpo hacia afuera
      const rightLimit = Math.min(maskW - 1, cx + maxSearchRadiusPx);
      for (let x = cx; x <= rightLimit; x++) {
        const val = row[x * 4 + 3] || row[x * 4];
        if (val > 100) {
          maxX = x;
        } else if (x - cx > 5) {
          break;
        }
      }

      const detectedLeftX = (minX / maskW) * canvasWidth;
      const detectedRightX = (maxX / maskW) * canvasWidth;
      const detectedW = detectedRightX - detectedLeftX;

      // Validación estricta: sólo aceptar si está en rango anatómico razonable
      if (detectedW >= expectedWidth * 0.72 && detectedW <= expectedWidth * 1.32) {
        return { leftX: detectedLeftX, rightX: detectedRightX, width: detectedW };
      }
    } catch {
      // Fallback
    }
    return null;
  }

  // 4. MOTOR DE DEFORMACIÓN POR TRIÁNGULOS AFINES (Piecewise Affine Texture Warper)
  private drawTexturedTriangle(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const delta = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
    if (Math.abs(delta) < 0.0001) return;

    // Matriz afín directa [a, c, e; b, d, f]
    const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / delta;
    const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / delta;
    const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
    const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;

    // Expansión sub-pixel para eliminar líneas de costura por antialiasing
    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;
    const bleed = 0.8;
    const d0x = x0 - cx,
      d0y = y0 - cy;
    const d1x = x1 - cx,
      d1y = y1 - cy;
    const d2x = x2 - cx,
      d2y = y2 - cy;
    const l0 = Math.hypot(d0x, d0y) || 1;
    const l1 = Math.hypot(d1x, d1y) || 1;
    const l2 = Math.hypot(d2x, d2y) || 1;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + (d0x / l0) * bleed, y0 + (d0y / l0) * bleed);
    ctx.lineTo(x1 + (d1x / l1) * bleed, y1 + (d1y / l1) * bleed);
    ctx.lineTo(x2 + (d2x / l2) * bleed, y2 + (d2y / l2) * bleed);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  // Zona Superior: Hombros, Torso y Ruedo con Malla Bilineal 5x5 Curva Adaptativa
  private drawTopGarmentMesh(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    ls: any,
    rs: any,
    le: any,
    re: any,
    lh: any,
    rh: any,
    w: number,
    h: number
  ): void {
    const imgUrl = this.getGarmentImageUrl(product, this.isBackDetected());
    const img = this.getLoadedImage(imgUrl);
    if (!img) return;

    const imgW = img.naturalWidth || img.width || 500;
    const imgH = img.naturalHeight || img.height || 500;

    const scale = this.scaleMultiplier();
    const vOffset = (this.verticalOffset() * h) / 100;

    // Distancia de hombros en pantalla
    const shDist = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    if (shDist < 10) return;

    // Ordenar hombros y puntos de izquierda a derecha en canvas
    const isLsScreenLeft = ls.x <= rs.x;
    const sLeft = isLsScreenLeft ? ls : rs;
    const sRight = isLsScreenLeft ? rs : ls;
    const eLeft = isLsScreenLeft ? le : re;
    const eRight = isLsScreenLeft ? re : le;
    const hLeft = isLsScreenLeft ? lh : rh;
    const hRight = isLsScreenLeft ? rh : lh;

    // Puntos medios de hombros y caderas
    const midShX = (sLeft.x + sRight.x) / 2;
    const midShY = (sLeft.y + sRight.y) / 2 + vOffset;
    const midHpX = (hLeft.x + hRight.x) / 2;
    const midHpY = (hLeft.y + hRight.y) / 2 + vOffset;

    // Vector espinal de hombros a caderas
    const spineDx = midHpX - midShX;
    const spineDy = midHpY - midShY;
    const spineLen = Math.hypot(spineDx, spineDy) || (shDist * 1.5);
    const spUx = spineDx / spineLen;
    const spUy = spineDy / spineLen;

    // Vector lateral (de izquierda a derecha en pantalla, perpendicular a la columna)
    let latUx = -spUy;
    let latUy = spUx;
    if (latUx * (sRight.x - sLeft.x) + latUy * (sRight.y - sLeft.y) < 0) {
      latUx = -latUx;
      latUy = -latUy;
    }

    // Factor de entalle al cuerpo (Fit)
    const fitFactor =
      this.bodyFitTightness() === 'slim'
        ? 0.94
        : this.bodyFitTightness() === 'regular'
        ? 1.03
        : 1.14;

    // Ángulo de rotación 3D para efecto de volumen cilíndrico
    const yawRad = (this.bodyYawAngle() * Math.PI) / 180;
    const yawCos = Math.max(0.68, Math.cos(yawRad));
    const yawShiftX = Math.sin(yawRad) * (shDist * 0.12 * scale);

    // 5 filas anatómicas del torso:
    // Row 0: Cuello / Clavícula (base del cuello, descansa elegantemente sobre la clavícula)
    // Row 1: Pecho alto / Axilas
    // Row 2: Torso medio / Costillas
    // Row 3: Cintura
    // Row 4: Ruedo inferior (con inercia física suave)
    interface RowSpec {
      t: number;
      baseWidthFactor: number;
    }

    const rowSpecs: RowSpec[] = [
      { t: -0.06, baseWidthFactor: 1.15 },
      { t: 0.28, baseWidthFactor: 1.18 },
      { t: 0.58, baseWidthFactor: 1.06 },
      { t: 0.88, baseWidthFactor: 1.08 },
      { t: 1.18, baseWidthFactor: 1.16 },
    ];

    const phys = this.hemClothPhysics;
    const numRows = rowSpecs.length;
    const numCols = 5; // 4 quads por fila = 32 triángulos sin distorsión diagonal

    const P: { x: number; y: number }[][] = [];
    const UV: { u: number; v: number }[][] = [];

    for (let i = 0; i < numRows; i++) {
      const spec = rowSpecs[i];
      let rowW = shDist * spec.baseWidthFactor * scale * fitFactor * yawCos;

      let cx = midShX + spUx * (spec.t * spineLen) + yawShiftX;
      let cy = midShY + spUy * (spec.t * spineLen);

      // Si es el ruedo (última fila), aplicar inercia física suave de vaivén
      if (i === numRows - 1 && phys.initialized) {
        const swayX = (phys.center.x - midHpX) * 0.35;
        const swayY = (phys.center.y - midHpY) * 0.25;
        cx += swayX;
        cy += swayY;
      }

      // Si está activado el ajuste por sensor de profundidad / silueta, refinar
      if (i >= 1 && i <= 3) {
        const contour = this.getBodyContourAtY(cy / h, cx, w, rowW);
        if (contour) {
          rowW = rowW * 0.45 + contour.width * 0.55 * fitFactor;
          cx = cx * 0.5 + ((contour.leftX + contour.rightX) / 2) * 0.5;
        }
      }

      P[i] = [];
      UV[i] = [];

      for (let j = 0; j < numCols; j++) {
        const f = j / (numCols - 1) - 0.5;
        const curveOffset = Math.cos(f * Math.PI) * (shDist * 0.04 * scale);

        let vx = cx + latUx * (f * rowW) + spUx * (curveOffset * 0.3);
        let vy = cy + latUy * (f * rowW) + spUy * (curveOffset * 0.3);

        // Si es la fila 1 (pecho/mangas) y los brazos se levantan:
        if (i === 1) {
          if (j === 0 && eLeft) {
            const armDx = eLeft.x - sLeft.x;
            const armDy = eLeft.y - sLeft.y;
            const armLen = Math.hypot(armDx, armDy) || 1;
            if (armDx < -15) {
              vx += (armDx / armLen) * Math.min(Math.abs(armDx), shDist * 0.2);
              vy += (armDy / armLen) * Math.min(Math.abs(armDy), shDist * 0.14);
            }
          } else if (j === numCols - 1 && eRight) {
            const armDx = eRight.x - sRight.x;
            const armDy = eRight.y - sRight.y;
            const armLen = Math.hypot(armDx, armDy) || 1;
            if (armDx > 15) {
              vx += (armDx / armLen) * Math.min(armDx, shDist * 0.2);
              vy += (armDy / armLen) * Math.min(armDy, shDist * 0.14);
            }
          }
        }

        P[i][j] = { x: vx, y: vy };
        UV[i][j] = {
          u: (j / (numCols - 1)) * imgW,
          v: (i / (numRows - 1)) * imgH,
        };
      }
    }

    // Renderizar la cuadrícula de quads regulares (cada quad se divide en 2 triángulos idénticos)
    for (let i = 0; i < numRows - 1; i++) {
      for (let j = 0; j < numCols - 1; j++) {
        const p00 = P[i][j];
        const p10 = P[i][j + 1];
        const p01 = P[i + 1][j];
        const p11 = P[i + 1][j + 1];

        const uv00 = UV[i][j];
        const uv10 = UV[i][j + 1];
        const uv01 = UV[i + 1][j];
        const uv11 = UV[i + 1][j + 1];

        // Triángulo 1 (Top-Left)
        this.drawTexturedTriangle(
          ctx,
          img,
          uv00.u,
          uv00.v,
          uv10.u,
          uv10.v,
          uv01.u,
          uv01.v,
          p00.x,
          p00.y,
          p10.x,
          p10.y,
          p01.x,
          p01.y
        );

        // Triángulo 2 (Bottom-Right)
        this.drawTexturedTriangle(
          ctx,
          img,
          uv10.u,
          uv10.v,
          uv11.u,
          uv11.v,
          uv01.u,
          uv01.v,
          p10.x,
          p10.y,
          p11.x,
          p11.y,
          p01.x,
          p01.y
        );
      }
    }
  }

  // Zona Inferior: Caderas, Muslos, Rodillas Articuladas y Tobillos
  private drawBottomGarmentMesh(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    lh: any,
    rh: any,
    lk: any,
    rk: any,
    la: any,
    ra: any,
    w: number,
    h: number
  ): void {
    const imgUrl = this.getGarmentImageUrl(product, this.isBackDetected());
    const img = this.getLoadedImage(imgUrl);
    if (!img) return;

    const imgW = img.naturalWidth || img.width || 500;
    const imgH = img.naturalHeight || img.height || 500;

    const scale = this.scaleMultiplier();
    const vOffset = (this.verticalOffset() * h) / 100;

    // Ordenar de izquierda a derecha en pantalla
    const isLhScreenLeft = lh.x <= rh.x;
    const hipL = isLhScreenLeft ? lh : rh;
    const hipR = isLhScreenLeft ? rh : lh;
    const kneeL = isLhScreenLeft ? lk : rk;
    const kneeR = isLhScreenLeft ? rk : lk;
    const ankleL = isLhScreenLeft ? la : ra;
    const ankleR = isLhScreenLeft ? ra : la;

    const hipDist = Math.hypot(hipR.x - hipL.x, hipR.y - hipL.y) || 60;
    const midHipX = (hipL.x + hipR.x) / 2;

    const fitFactor =
      this.bodyFitTightness() === 'slim'
        ? 0.93
        : this.bodyFitTightness() === 'regular'
        ? 1.02
        : 1.12;

    const legWidth = hipDist * 0.38 * scale * fitFactor;

    // Renderizar cada pierna como tira de quads articulada en la rodilla
    const renderLeg = (
      hPt: any,
      kPt: any,
      aPt: any,
      isLeftLeg: boolean
    ) => {
      const thighDx = kPt.x - hPt.x;
      const thighDy = kPt.y - hPt.y;
      const thighLen = Math.hypot(thighDx, thighDy) || (hipDist * 1.5);
      const thighNormX = -thighDy / thighLen;
      const thighNormY = thighDx / thighLen;

      const calfDx = aPt.x - kPt.x;
      const calfDy = aPt.y - kPt.y;
      const calfLen = Math.hypot(calfDx, calfDy) || (hipDist * 1.5);
      const calfNormX = -calfDy / calfLen;
      const calfNormY = calfDx / calfLen;

      const legPoints: { x: number; y: number }[][] = [];
      const legUVs: { u: number; v: number }[][] = [];

      const uMin = isLeftLeg ? 0 : 0.5 * imgW;
      const uMax = isLeftLeg ? 0.5 * imgW : imgW;

      const rows = [
        {
          cx: (hPt.x + midHipX) / 2,
          cy: hPt.y + vOffset,
          nx: thighNormX,
          ny: thighNormY,
          w: legWidth * 1.1,
          v: 0.05 * imgH,
        },
        {
          cx: hPt.x + thighDx * 0.45,
          cy: hPt.y + vOffset + thighDy * 0.45,
          nx: thighNormX,
          ny: thighNormY,
          w: legWidth * 1.0,
          v: 0.35 * imgH,
        },
        {
          cx: kPt.x,
          cy: kPt.y + vOffset,
          nx: (thighNormX + calfNormX) / 2,
          ny: (thighNormY + calfNormY) / 2,
          w: legWidth * 0.88,
          v: 0.60 * imgH,
        },
        {
          cx: kPt.x + calfDx * 0.5,
          cy: kPt.y + vOffset + calfDy * 0.5,
          nx: calfNormX,
          ny: calfNormY,
          w: legWidth * 0.82,
          v: 0.82 * imgH,
        },
        {
          cx: aPt.x,
          cy: aPt.y + vOffset,
          nx: calfNormX,
          ny: calfNormY,
          w: legWidth * 0.78,
          v: 0.98 * imgH,
        },
      ];

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const half = row.w / 2;
        legPoints[r] = [
          { x: row.cx - row.nx * half, y: row.cy - row.ny * half },
          { x: row.cx, y: row.cy },
          { x: row.cx + row.nx * half, y: row.cy + row.ny * half },
        ];
        legUVs[r] = [
          { u: uMin, v: row.v },
          { u: (uMin + uMax) / 2, v: row.v },
          { u: uMax, v: row.v },
        ];
      }

      for (let r = 0; r < rows.length - 1; r++) {
        for (let c = 0; c < 2; c++) {
          const p00 = legPoints[r][c];
          const p10 = legPoints[r][c + 1];
          const p01 = legPoints[r + 1][c];
          const p11 = legPoints[r + 1][c + 1];

          const uv00 = legUVs[r][c];
          const uv10 = legUVs[r][c + 1];
          const uv01 = legUVs[r + 1][c];
          const uv11 = legUVs[r + 1][c + 1];

          this.drawTexturedTriangle(
            ctx,
            img,
            uv00.u,
            uv00.v,
            uv10.u,
            uv10.v,
            uv01.u,
            uv01.v,
            p00.x,
            p00.y,
            p10.x,
            p10.y,
            p01.x,
            p01.y
          );

          this.drawTexturedTriangle(
            ctx,
            img,
            uv10.u,
            uv10.v,
            uv11.u,
            uv11.v,
            uv01.u,
            uv01.v,
            p10.x,
            p10.y,
            p11.x,
            p11.y,
            p01.x,
            p01.y
          );
        }
      }
    };

    renderLeg(hipL, kneeL, ankleL, true);
    renderLeg(hipR, kneeR, ankleR, false);
  }

  // Zona Cuerpo Entero: Vestidos y Enterizos con Malla Bilineal Continua 7x5
  private drawFullBodyGarmentMesh(
    ctx: CanvasRenderingContext2D,
    product: Producto,
    ls: any,
    rs: any,
    le: any,
    re: any,
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

    const imgW = img.naturalWidth || img.width || 500;
    const imgH = img.naturalHeight || img.height || 500;

    const scale = this.scaleMultiplier();
    const vOffset = (this.verticalOffset() * h) / 100;

    const shDist = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    if (shDist < 10) return;

    const isLsScreenLeft = ls.x <= rs.x;
    const sLeft = isLsScreenLeft ? ls : rs;
    const sRight = isLsScreenLeft ? rs : ls;
    const hLeft = isLsScreenLeft ? lh : rh;
    const hRight = isLsScreenLeft ? rh : lh;

    const midShX = (sLeft.x + sRight.x) / 2;
    const midShY = (sLeft.y + sRight.y) / 2 + vOffset;
    const midHpX = (hLeft.x + hRight.x) / 2;
    const midHpY = (hLeft.y + hRight.y) / 2 + vOffset;

    const spineDx = midHpX - midShX;
    const spineDy = midHpY - midShY;
    const spineLen = Math.hypot(spineDx, spineDy) || (shDist * 1.5);
    const spUx = spineDx / spineLen;
    const spUy = spineDy / spineLen;

    let latUx = -spUy;
    let latUy = spUx;
    if (latUx * (sRight.x - sLeft.x) + latUy * (sRight.y - sLeft.y) < 0) {
      latUx = -latUx;
      latUy = -latUy;
    }

    const fitFactor =
      this.bodyFitTightness() === 'slim'
        ? 0.94
        : this.bodyFitTightness() === 'regular'
        ? 1.03
        : 1.14;

    const yawRad = (this.bodyYawAngle() * Math.PI) / 180;
    const yawCos = Math.max(0.68, Math.cos(yawRad));
    const yawShiftX = Math.sin(yawRad) * (shDist * 0.12 * scale);

    const rowSpecs = [
      { t: -0.06, baseWidthFactor: 1.15 },
      { t: 0.28, baseWidthFactor: 1.18 },
      { t: 0.60, baseWidthFactor: 1.04 },
      { t: 0.90, baseWidthFactor: 1.08 },
      { t: 1.25, baseWidthFactor: 1.25 },
      { t: 1.60, baseWidthFactor: 1.45 },
      { t: 1.95, baseWidthFactor: 1.65 },
    ];

    const phys = this.hemClothPhysics;
    const numRows = rowSpecs.length;
    const numCols = 5;

    const P: { x: number; y: number }[][] = [];
    const UV: { u: number; v: number }[][] = [];

    for (let i = 0; i < numRows; i++) {
      const spec = rowSpecs[i];
      let rowW = shDist * spec.baseWidthFactor * scale * fitFactor * yawCos;

      let cx = midShX + spUx * (spec.t * spineLen) + yawShiftX;
      let cy = midShY + spUy * (spec.t * spineLen);

      if (i === numRows - 1 && phys.initialized) {
        const swayX = (phys.center.x - midHpX) * 0.45;
        const swayY = (phys.center.y - midHpY) * 0.3;
        cx += swayX;
        cy += swayY;
      }

      if (i >= 1 && i <= 3) {
        const contour = this.getBodyContourAtY(cy / h, cx, w, rowW);
        if (contour) {
          rowW = rowW * 0.45 + contour.width * 0.55 * fitFactor;
          cx = cx * 0.5 + ((contour.leftX + contour.rightX) / 2) * 0.5;
        }
      }

      P[i] = [];
      UV[i] = [];

      for (let j = 0; j < numCols; j++) {
        const f = j / (numCols - 1) - 0.5;
        const curveOffset = Math.cos(f * Math.PI) * (shDist * 0.04 * scale);

        const vx = cx + latUx * (f * rowW) + spUx * (curveOffset * 0.3);
        const vy = cy + latUy * (f * rowW) + spUy * (curveOffset * 0.3);

        P[i][j] = { x: vx, y: vy };
        UV[i][j] = {
          u: (j / (numCols - 1)) * imgW,
          v: (i / (numRows - 1)) * imgH,
        };
      }
    }

    for (let i = 0; i < numRows - 1; i++) {
      for (let j = 0; j < numCols - 1; j++) {
        const p00 = P[i][j];
        const p10 = P[i][j + 1];
        const p01 = P[i + 1][j];
        const p11 = P[i + 1][j + 1];

        const uv00 = UV[i][j];
        const uv10 = UV[i][j + 1];
        const uv01 = UV[i + 1][j];
        const uv11 = UV[i + 1][j + 1];

        this.drawTexturedTriangle(
          ctx,
          img,
          uv00.u,
          uv00.v,
          uv10.u,
          uv10.v,
          uv01.u,
          uv01.v,
          p00.x,
          p00.y,
          p10.x,
          p10.y,
          p01.x,
          p01.y
        );

        this.drawTexturedTriangle(
          ctx,
          img,
          uv10.u,
          uv10.v,
          uv11.u,
          uv11.v,
          uv01.u,
          uv01.v,
          p10.x,
          p10.y,
          p11.x,
          p11.y,
          p01.x,
          p01.y
        );
      }
    }
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
