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

  // Snapshot / Captura
  snapshotUrl = signal<string>('');
  showSnapshotModal = signal<boolean>(false);

  // Carrito y Notificaciones
  isAddingToCart = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  // Instancias de MediaPipe y Filtros Anti-Temblor
  private pose: any = null;
  private camera: any = null;
  private isProcessingFrame = false;
  private imageCache = new Map<string, HTMLImageElement>();
  private animationFrameId: number | null = null;
  private smoothedPoints = new Map<number, { x: number; y: number; z: number }>();
  private backScoreCounter = 0;

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

    // Vector normal del torso (producto cruz entre eje de hombros y eje espinal)
    const sX = rawRs.x - rawLs.x;
    const sY = rawRs.y - rawLs.y;
    const midShX = (rawLs.x + rawRs.x) / 2;
    const midShY = (rawLs.y + rawRs.y) / 2;
    const midHpX = (rawLh.x + rawRh.x) / 2;
    const midHpY = (rawLh.y + rawRh.y) / 2;
    const tX = midHpX - midShX;
    const tY = midHpY - midShY;
    const normalZ = sX * tY - sY * tX;

    // Ángulo de giro horizontal (Yaw) en grados
    const shoulderDx = rawRs.x - rawLs.x;
    const shoulderDz = (rawRs.z - rawLs.z) * 2.2;
    const yawAngle = Math.atan2(shoulderDz, shoulderDx) * (180 / Math.PI);
    this.bodyYawAngle.set(Math.round(yawAngle));

    // Detección determinista de Espalda
    const isBackByZ = zDiff > 0.035;
    const isBackByEars =
      (rawNose.visibility ?? 1) < 0.35 &&
      ((rawLe?.visibility ?? 0) > 0.45 || (rawRe?.visibility ?? 0) > 0.45);
    const isBackByNormal = isMirror ? normalZ < -0.05 : normalZ > 0.05;

    const isBackDetectedFrame = isBackByZ || isBackByEars || isBackByNormal;

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

    const absYaw = Math.abs(yawAngle);
    if (absYaw > 65 && absYaw < 115) {
      this.bodyOrientation.set('perfil');
    } else if (this.isBackDetected()) {
      this.bodyOrientation.set('espalda');
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

  // Zona Superior: Hombros, Torso, Mangas Dinámicas y Ruedo con Inercia
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

    // Distancia y vectores del torso
    const shDist = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const midShX = (ls.x + rs.x) / 2;
    const midShY = (ls.y + rs.y) / 2 + vOffset;
    const midHpX = (lh.x + rh.x) / 2;
    const midHpY = (lh.y + rh.y) / 2 + vOffset;

    const spineDx = midHpX - midShX;
    const spineDy = midHpY - midShY;
    const spineLen = Math.hypot(spineDx, spineDy) || 1;
    const upX = -spineDx / spineLen;
    const upY = -spineDy / spineLen;

    const latDx = (rs.x - ls.x) / shDist;
    const latDy = (rs.y - ls.y) / shDist;

    // 1. PUNTOS CLAVE EN DESTINO (CANVAS)
    // Cuello
    const dCollarMid = {
      x: midShX + upX * (shDist * 0.18 * scale),
      y: midShY + upY * (shDist * 0.18 * scale),
    };
    const dCollarL = {
      x: dCollarMid.x - latDx * (shDist * 0.18 * scale),
      y: dCollarMid.y - latDy * (shDist * 0.18 * scale),
    };
    const dCollarR = {
      x: dCollarMid.x + latDx * (shDist * 0.18 * scale),
      y: dCollarMid.y + latDy * (shDist * 0.18 * scale),
    };

    // Hombros
    const dShoulderL = {
      x: ls.x - latDx * (shDist * 0.08 * scale),
      y: ls.y + vOffset - latDy * (shDist * 0.08 * scale),
    };
    const dShoulderR = {
      x: rs.x + latDx * (shDist * 0.08 * scale),
      y: rs.y + vOffset + latDy * (shDist * 0.08 * scale),
    };

    // Axilas
    const dArmpitL = {
      x: ls.x + (lh.x - ls.x) * 0.32 - latDx * (shDist * 0.04 * scale),
      y: ls.y + (lh.y - ls.y) * 0.32 + vOffset,
    };
    const dArmpitR = {
      x: rs.x + (rh.x - rs.x) * 0.32 + latDx * (shDist * 0.04 * scale),
      y: rs.y + (rh.y - rs.y) * 0.32 + vOffset,
    };

    // Pecho
    const dChestMid = {
      x: midShX + spineDx * 0.4,
      y: midShY + spineDy * 0.4,
    };

    // Cintura
    const dWaistL = {
      x: lh.x - latDx * (shDist * 0.05 * scale),
      y: lh.y + vOffset,
    };
    const dWaistR = {
      x: rh.x + latDx * (shDist * 0.05 * scale),
      y: rh.y + vOffset,
    };
    const dWaistMid = {
      x: (dWaistL.x + dWaistR.x) / 2,
      y: (dWaistL.y + dWaistR.y) / 2,
    };

    // Mangas dinámicas orientadas según el brazo real (Hombro -> Codo)
    // Brazo Izquierdo
    const armLX = le.x - ls.x;
    const armLY = le.y - ls.y;
    const armLLen = Math.hypot(armLX, armLY) || 1;
    const armLNormX = -armLY / armLLen;
    const armLNormY = armLX / armLLen;
    const reachL = Math.min(armLLen * 0.68, shDist * 0.72) * scale;
    const dSleeveCuffL = {
      x: ls.x + (armLX / armLLen) * reachL,
      y: ls.y + vOffset + (armLY / armLLen) * reachL,
    };
    const dSleeveOutL = {
      x:
        ls.x +
        (armLX / armLLen) * (reachL * 0.5) +
        armLNormX * (shDist * 0.22 * scale),
      y:
        ls.y +
        vOffset +
        (armLY / armLLen) * (reachL * 0.5) +
        armLNormY * (shDist * 0.22 * scale),
    };

    // Brazo Derecho
    const armRX = re.x - rs.x;
    const armRY = re.y - rs.y;
    const armRLen = Math.hypot(armRX, armRY) || 1;
    const armRNormX = armRY / armRLen;
    const armRNormY = -armRX / armRLen;
    const reachR = Math.min(armRLen * 0.68, shDist * 0.72) * scale;
    const dSleeveCuffR = {
      x: rs.x + (armRX / armRLen) * reachR,
      y: rs.y + vOffset + (armRY / armRLen) * reachR,
    };
    const dSleeveOutR = {
      x:
        rs.x +
        (armRX / armRLen) * (reachR * 0.5) +
        armRNormX * (shDist * 0.22 * scale),
      y:
        rs.y +
        vOffset +
        (armRY / armRLen) * (reachR * 0.5) +
        armRNormY * (shDist * 0.22 * scale),
    };

    // Ruedo con inercia de tela (Spring physics)
    const phys = this.hemClothPhysics;
    const dHemL = { x: phys.left.x, y: phys.left.y + vOffset };
    const dHemR = { x: phys.right.x, y: phys.right.y + vOffset };
    const dHemMid = { x: phys.center.x, y: phys.center.y + vOffset };

    // 2. COORDENADAS DE TEXTURA UV (ORIGEN)
    const uvCollarMid = { u: imgW * 0.5, v: imgH * 0.07 };
    const uvCollarL = { u: imgW * 0.38, v: imgH * 0.11 };
    const uvCollarR = { u: imgW * 0.62, v: imgH * 0.11 };
    const uvShoulderL = { u: imgW * 0.16, v: imgH * 0.15 };
    const uvShoulderR = { u: imgW * 0.84, v: imgH * 0.15 };
    const uvSleeveOutL = { u: imgW * 0.02, v: imgH * 0.35 };
    const uvSleeveOutR = { u: imgW * 0.98, v: imgH * 0.35 };
    const uvSleeveCuffL = { u: imgW * 0.03, v: imgH * 0.52 };
    const uvSleeveCuffR = { u: imgW * 0.97, v: imgH * 0.52 };
    const uvArmpitL = { u: imgW * 0.26, v: imgH * 0.38 };
    const uvArmpitR = { u: imgW * 0.74, v: imgH * 0.38 };
    const uvChestMid = { u: imgW * 0.5, v: imgH * 0.38 };
    const uvWaistL = { u: imgW * 0.26, v: imgH * 0.72 };
    const uvWaistR = { u: imgW * 0.74, v: imgH * 0.72 };
    const uvWaistMid = { u: imgW * 0.5, v: imgH * 0.72 };
    const uvHemL = { u: imgW * 0.25, v: imgH * 0.98 };
    const uvHemR = { u: imgW * 0.75, v: imgH * 0.98 };
    const uvHemMid = { u: imgW * 0.5, v: imgH * 0.98 };

    // 3. RENDERIZADO DE LOS 18 TRIÁNGULOS AFINES DE LA PRENDA
    const drawTri = (p0: any, p1: any, p2: any, d0: any, d1: any, d2: any) => {
      this.drawTexturedTriangle(
        ctx,
        img,
        p0.u,
        p0.v,
        p1.u,
        p1.v,
        p2.u,
        p2.v,
        d0.x,
        d0.y,
        d1.x,
        d1.y,
        d2.x,
        d2.y
      );
    };

    // Cuello y Torso Superior
    drawTri(uvCollarMid, uvCollarL, uvChestMid, dCollarMid, dCollarL, dChestMid);
    drawTri(uvCollarMid, uvChestMid, uvCollarR, dCollarMid, dChestMid, dCollarR);
    drawTri(uvCollarL, uvShoulderL, uvArmpitL, dCollarL, dShoulderL, dArmpitL);
    drawTri(uvCollarL, uvArmpitL, uvChestMid, dCollarL, dArmpitL, dChestMid);
    drawTri(uvCollarR, uvChestMid, uvArmpitR, dCollarR, dChestMid, dArmpitR);
    drawTri(uvCollarR, uvArmpitR, uvShoulderR, dCollarR, dArmpitR, dShoulderR);

    // Manga Izquierda (Sigue el codo)
    drawTri(
      uvShoulderL,
      uvSleeveOutL,
      uvArmpitL,
      dShoulderL,
      dSleeveOutL,
      dArmpitL
    );
    drawTri(
      uvSleeveOutL,
      uvSleeveCuffL,
      uvArmpitL,
      dSleeveOutL,
      dSleeveCuffL,
      dArmpitL
    );

    // Manga Derecha (Sigue el codo)
    drawTri(
      uvShoulderR,
      uvArmpitR,
      uvSleeveOutR,
      dShoulderR,
      dArmpitR,
      dSleeveOutR
    );
    drawTri(
      uvSleeveOutR,
      uvArmpitR,
      uvSleeveCuffR,
      dSleeveOutR,
      dArmpitR,
      dSleeveCuffR
    );

    // Torso Medio (Se flexiona con la cintura)
    drawTri(uvArmpitL, uvWaistL, uvChestMid, dArmpitL, dWaistL, dChestMid);
    drawTri(uvArmpitR, uvChestMid, uvWaistR, dArmpitR, dChestMid, dWaistR);
    drawTri(uvChestMid, uvWaistL, uvWaistMid, dChestMid, dWaistL, dWaistMid);
    drawTri(uvChestMid, uvWaistMid, uvWaistR, dChestMid, dWaistMid, dWaistR);

    // Ruedo Inferior con Física de Balanceo
    drawTri(uvWaistL, uvHemL, uvWaistMid, dWaistL, dHemL, dWaistMid);
    drawTri(uvWaistMid, uvHemL, uvHemMid, dWaistMid, dHemL, dHemMid);
    drawTri(uvWaistMid, uvHemMid, uvHemR, dWaistMid, dHemMid, dHemR);
    drawTri(uvWaistR, uvWaistMid, uvHemR, dWaistR, dWaistMid, dHemR);
  }

  // Zona Inferior: Caderas, Muslos, Rodillas Flexibles y Tobillos
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

    const hipDist = Math.hypot(rh.x - lh.x, rh.y - lh.y);
    const dWaistL = {
      x: lh.x - (rh.x - lh.x) * 0.12 * scale,
      y: lh.y + vOffset,
    };
    const dWaistR = {
      x: rh.x + (rh.x - lh.x) * 0.12 * scale,
      y: rh.y + vOffset,
    };
    const dWaistMid = {
      x: (dWaistL.x + dWaistR.x) / 2,
      y: (dWaistL.y + dWaistR.y) / 2,
    };

    // Tiro / Entrepierna
    const dCrotch = {
      x: dWaistMid.x,
      y: dWaistMid.y + hipDist * 0.5 * scale,
    };

    // Rodillas con grosor anatómico
    const legLDirX = lk.x - lh.x;
    const legLDirY = lk.y - lh.y;
    const legLLen = Math.hypot(legLDirX, legLDirY) || 1;
    const legLNormX = -legLDirY / legLLen;
    const legLNormY = legLDirX / legLLen;

    const legRDirX = rk.x - rh.x;
    const legRDirY = rk.y - rh.y;
    const legRLen = Math.hypot(legRDirX, legRDirY) || 1;
    const legRNormX = legRDirY / legRLen;
    const legRNormY = -legRDirX / legRLen;

    const kneeWidth = hipDist * 0.28 * scale;
    const dKneeLOut = {
      x: lk.x + legLNormX * kneeWidth,
      y: lk.y + vOffset + legLNormY * kneeWidth,
    };
    const dKneeLIn = {
      x: lk.x - legLNormX * (kneeWidth * 0.6),
      y: lk.y + vOffset - legLNormY * (kneeWidth * 0.6),
    };
    const dKneeROut = {
      x: rk.x + legRNormX * kneeWidth,
      y: rk.y + vOffset + legRNormY * kneeWidth,
    };
    const dKneeRIn = {
      x: rk.x - legRNormX * (kneeWidth * 0.6),
      y: rk.y + vOffset - legRNormY * (kneeWidth * 0.6),
    };

    // Tobillos / Ruedo de pantalón
    const ankleWidth = hipDist * 0.24 * scale;
    const dAnkleLOut = {
      x: la.x + legLNormX * ankleWidth,
      y: la.y + vOffset + legLNormY * ankleWidth,
    };
    const dAnkleLIn = {
      x: la.x - legLNormX * (ankleWidth * 0.5),
      y: la.y + vOffset - legLNormY * (ankleWidth * 0.5),
    };
    const dAnkleROut = {
      x: ra.x + legRNormX * ankleWidth,
      y: ra.y + vOffset + legRNormY * ankleWidth,
    };
    const dAnkleRIn = {
      x: ra.x - legRNormX * (ankleWidth * 0.5),
      y: ra.y + vOffset - legRNormY * (ankleWidth * 0.5),
    };

    // Coordenadas UV de la textura
    const uvWaistL = { u: imgW * 0.18, v: imgH * 0.05 };
    const uvWaistR = { u: imgW * 0.82, v: imgH * 0.05 };
    const uvWaistMid = { u: imgW * 0.5, v: imgH * 0.05 };
    const uvCrotch = { u: imgW * 0.5, v: imgH * 0.32 };
    const uvKneeLOut = { u: imgW * 0.16, v: imgH * 0.6 };
    const uvKneeLIn = { u: imgW * 0.44, v: imgH * 0.6 };
    const uvKneeROut = { u: imgW * 0.84, v: imgH * 0.6 };
    const uvKneeRIn = { u: imgW * 0.56, v: imgH * 0.6 };
    const uvAnkleLOut = { u: imgW * 0.18, v: imgH * 0.98 };
    const uvAnkleLIn = { u: imgW * 0.42, v: imgH * 0.98 };
    const uvAnkleROut = { u: imgW * 0.82, v: imgH * 0.98 };
    const uvAnkleRIn = { u: imgW * 0.58, v: imgH * 0.98 };

    const drawTri = (p0: any, p1: any, p2: any, d0: any, d1: any, d2: any) => {
      this.drawTexturedTriangle(
        ctx,
        img,
        p0.u,
        p0.v,
        p1.u,
        p1.v,
        p2.u,
        p2.v,
        d0.x,
        d0.y,
        d1.x,
        d1.y,
        d2.x,
        d2.y
      );
    };

    // Cuadrilátero pélvico
    drawTri(uvWaistL, uvCrotch, uvWaistMid, dWaistL, dCrotch, dWaistMid);
    drawTri(uvWaistMid, uvCrotch, uvWaistR, dWaistMid, dCrotch, dWaistR);

    // Pierna Izquierda (Muslo y Pantorrilla que se flexionan en la rodilla)
    drawTri(uvWaistL, uvKneeLOut, uvCrotch, dWaistL, dKneeLOut, dCrotch);
    drawTri(uvCrotch, uvKneeLOut, uvKneeLIn, dCrotch, dKneeLOut, dKneeLIn);
    drawTri(
      uvKneeLOut,
      uvAnkleLOut,
      uvKneeLIn,
      dKneeLOut,
      dAnkleLOut,
      dKneeLIn
    );
    drawTri(
      uvKneeLIn,
      uvAnkleLOut,
      uvAnkleLIn,
      dKneeLIn,
      dAnkleLOut,
      dAnkleLIn
    );

    // Pierna Derecha (Muslo y Pantorrilla que se flexionan en la rodilla)
    drawTri(uvWaistR, uvCrotch, uvKneeROut, dWaistR, dCrotch, dKneeROut);
    drawTri(uvCrotch, uvKneeRIn, uvKneeROut, dCrotch, dKneeRIn, dKneeROut);
    drawTri(
      uvKneeROut,
      uvKneeRIn,
      uvAnkleROut,
      dKneeROut,
      dKneeRIn,
      dAnkleROut
    );
    drawTri(
      uvKneeRIn,
      uvAnkleRIn,
      uvAnkleROut,
      dKneeRIn,
      dAnkleRIn,
      dAnkleROut
    );
  }

  // Zona Cuerpo Entero: Vestidos y Enterizos
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
    const midShX = (ls.x + rs.x) / 2;
    const midShY = (ls.y + rs.y) / 2 + vOffset;
    const midHpX = (lh.x + rh.x) / 2;
    const midHpY = (lh.y + rh.y) / 2 + vOffset;

    const spineDx = midHpX - midShX;
    const spineDy = midHpY - midShY;
    const spineLen = Math.hypot(spineDx, spineDy) || 1;
    const upX = -spineDx / spineLen;
    const upY = -spineDy / spineLen;
    const latDx = (rs.x - ls.x) / shDist;
    const latDy = (rs.y - ls.y) / shDist;

    // Cuello y Hombros
    const dCollarMid = {
      x: midShX + upX * (shDist * 0.16 * scale),
      y: midShY + upY * (shDist * 0.16 * scale),
    };
    const dShoulderL = {
      x: ls.x - latDx * (shDist * 0.08 * scale),
      y: ls.y + vOffset,
    };
    const dShoulderR = {
      x: rs.x + latDx * (shDist * 0.08 * scale),
      y: rs.y + vOffset,
    };
    const dChestMid = {
      x: midShX + spineDx * 0.35,
      y: midShY + spineDy * 0.35,
    };

    // Cintura
    const dWaistL = {
      x: lh.x - latDx * (shDist * 0.08 * scale),
      y: lh.y + vOffset,
    };
    const dWaistR = {
      x: rh.x + latDx * (shDist * 0.08 * scale),
      y: rh.y + vOffset,
    };
    const dWaistMid = {
      x: (dWaistL.x + dWaistR.x) / 2,
      y: (dWaistL.y + dWaistR.y) / 2,
    };

    // Ruedo fluido del vestido con inercia física
    const phys = this.hemClothPhysics;
    const dHemL = {
      x: phys.left.x - latDx * (shDist * 0.25 * scale),
      y: lk.y + vOffset,
    };
    const dHemR = {
      x: phys.right.x + latDx * (shDist * 0.25 * scale),
      y: rk.y + vOffset,
    };
    const dHemMid = {
      x: (dHemL.x + dHemR.x) / 2,
      y: (dHemL.y + dHemR.y) / 2,
    };

    // UVs
    const uvCollarMid = { u: imgW * 0.5, v: imgH * 0.06 };
    const uvShoulderL = { u: imgW * 0.18, v: imgH * 0.12 };
    const uvShoulderR = { u: imgW * 0.82, v: imgH * 0.12 };
    const uvChestMid = { u: imgW * 0.5, v: imgH * 0.3 };
    const uvWaistL = { u: imgW * 0.24, v: imgH * 0.5 };
    const uvWaistR = { u: imgW * 0.76, v: imgH * 0.5 };
    const uvWaistMid = { u: imgW * 0.5, v: imgH * 0.5 };
    const uvHemL = { u: imgW * 0.12, v: imgH * 0.98 };
    const uvHemR = { u: imgW * 0.88, v: imgH * 0.98 };
    const uvHemMid = { u: imgW * 0.5, v: imgH * 0.98 };

    const drawTri = (p0: any, p1: any, p2: any, d0: any, d1: any, d2: any) => {
      this.drawTexturedTriangle(
        ctx,
        img,
        p0.u,
        p0.v,
        p1.u,
        p1.v,
        p2.u,
        p2.v,
        d0.x,
        d0.y,
        d1.x,
        d1.y,
        d2.x,
        d2.y
      );
    };

    // Torso Superior
    drawTri(
      uvCollarMid,
      uvShoulderL,
      uvChestMid,
      dCollarMid,
      dShoulderL,
      dChestMid
    );
    drawTri(
      uvCollarMid,
      uvChestMid,
      uvShoulderR,
      dCollarMid,
      dChestMid,
      dShoulderR
    );

    // Torso a Cintura
    drawTri(uvShoulderL, uvWaistL, uvChestMid, dShoulderL, dWaistL, dChestMid);
    drawTri(uvShoulderR, uvChestMid, uvWaistR, dShoulderR, dChestMid, dWaistR);
    drawTri(uvChestMid, uvWaistL, uvWaistMid, dChestMid, dWaistL, dWaistMid);
    drawTri(uvChestMid, uvWaistMid, uvWaistR, dChestMid, dWaistMid, dWaistR);

    // Falda fluida con inercia
    drawTri(uvWaistL, uvHemL, uvWaistMid, dWaistL, dHemL, dWaistMid);
    drawTri(uvWaistMid, uvHemL, uvHemMid, dWaistMid, dHemL, dHemMid);
    drawTri(uvWaistMid, uvHemMid, uvHemR, dWaistMid, dHemMid, dHemR);
    drawTri(uvWaistR, uvWaistMid, uvHemR, dWaistR, dWaistMid, dHemR);
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
