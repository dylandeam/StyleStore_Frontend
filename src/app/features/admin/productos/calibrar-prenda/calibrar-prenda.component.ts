import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface LandmarkPoint {
  key: string;
  label: string;
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
}

@Component({
  selector: 'app-calibrar-prenda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './calibrar-prenda.component.html',
  styleUrls: ['./calibrar-prenda.component.css'],
})
export class CalibrarPrendaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  codigo = signal<string>('');
  producto = signal<any>(null);
  imageUrl = signal<string>('');
  tipoAr = signal<string>('superior');
  isCalibrated = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  toast = signal<string | null>(null);

  currentPointIndex = signal<number>(0);
  landmarks = signal<LandmarkPoint[]>([]);

  readonly pointConfigs: Record<string, { key: string; label: string }[]> = {
    superior: [
      { key: 'hombro_izquierdo', label: 'Hombro Izquierdo (Vista)' },
      { key: 'cuello', label: 'Centro del Cuello' },
      { key: 'hombro_derecho', label: 'Hombro Derecho (Vista)' },
      { key: 'cintura_izquierda', label: 'Cintura / Ruedo Izquierdo' },
      { key: 'cintura_derecha', label: 'Cintura / Ruedo Derecho' },
      { key: 'manga_izquierda_fin', label: 'Fin Manga Izquierda' },
      { key: 'manga_derecha_fin', label: 'Fin Manga Derecha' },
    ],
    inferior: [
      { key: 'cintura_izquierda', label: 'Cintura Izquierda' },
      { key: 'cintura_derecha', label: 'Cintura Derecha' },
      { key: 'entrepierna', label: 'Entrepierna / Tiro' },
      { key: 'tobillo_izquierdo', label: 'Tobillo / Ruedo Izquierdo' },
      { key: 'tobillo_derecho', label: 'Tobillo / Ruedo Derecho' },
    ],
    vestido_completo: [
      { key: 'hombro_izquierdo', label: 'Hombro Izquierdo' },
      { key: 'cuello', label: 'Cuello Escote' },
      { key: 'hombro_derecho', label: 'Hombro Derecho' },
      { key: 'cintura_izquierda', label: 'Cintura Izquierda' },
      { key: 'cintura_derecha', label: 'Cintura Derecha' },
      { key: 'dobladillo_izquierdo', label: 'Dobladillo Izquierdo' },
      { key: 'dobladillo_derecho', label: 'Dobladillo Derecho' },
    ],
    accesorio: [
      { key: 'centro', label: 'Centro del Accesorio' },
      { key: 'ancho_referencia', label: 'Borde de Referencia Ancho' },
    ],
  };

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('codigo');
    if (code) {
      this.codigo.set(code);
      this.loadProductoAndLandmarks(code);
    }
  }

  loadProductoAndLandmarks(code: string): void {
    this.http.get<any>(`${environment.apiUrl}/v1/productos/${code}`).subscribe({
      next: (prod) => {
        this.producto.set(prod);
        const img = prod.foto_vestidor_frontal || prod.foto || '';
        this.imageUrl.set(img.startsWith('http') ? img : `${environment.apiUrl.replace('/api', '')}${img}`);

        const catTipo = (prod.tipo_prenda || '').toLowerCase();
        let arType = 'superior';
        if (catTipo.includes('inferior') || catTipo.includes('pantalon') || catTipo.includes('falda')) {
          arType = 'inferior';
        } else if (catTipo.includes('vestido') || catTipo.includes('cuerpo_entero')) {
          arType = 'vestido_completo';
        } else if (catTipo.includes('accesorio')) {
          arType = 'accesorio';
        }
        this.tipoAr.set(arType);
        this.initLandmarkPoints(arType);
        this.fetchExistingLandmarks(code);
      },
      error: () => this.showToast('Error al cargar datos del producto'),
    });
  }

  initLandmarkPoints(arType: string): void {
    const config = this.pointConfigs[arType] || this.pointConfigs['superior'];
    this.landmarks.set(
      config.map((item) => ({
        key: item.key,
        label: item.label,
        x: 0.5,
        y: 0.5,
      }))
    );
  }

  fetchExistingLandmarks(code: string): void {
    this.http.get<any>(`${environment.apiUrl}/v1/productos/${code}/landmarks`).subscribe({
      next: (res) => {
        if (res && res.landmarks) {
          this.isCalibrated.set(res.calibrado);
          this.tipoAr.set(res.tipo_ar || this.tipoAr());
          const config = this.pointConfigs[this.tipoAr()] || this.pointConfigs['superior'];

          const updated = config.map((item) => {
            const val = res.landmarks[item.key] || { x: 0.5, y: 0.5 };
            return {
              key: item.key,
              label: item.label,
              x: val.x,
              y: val.y,
            };
          });
          this.landmarks.set(updated);
        }
      },
      error: () => {},
    });
  }

  onImageClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    const idx = this.currentPointIndex();
    const list = [...this.landmarks()];
    if (idx < list.length) {
      list[idx] = { ...list[idx], x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
      this.landmarks.set(list);

      // Avanzar al siguiente punto si no estamos en el último
      if (idx < list.length - 1) {
        this.currentPointIndex.set(idx + 1);
      }
    }
  }

  selectPointIndex(index: number): void {
    this.currentPointIndex.set(index);
  }

  saveCalibration(): void {
    this.isSaving.set(true);
    const landmarkDict: Record<string, { x: number; y: number }> = {};
    this.landmarks().forEach((pt) => {
      landmarkDict[pt.key] = { x: pt.x, y: pt.y };
    });

    const body = {
      tipo_ar: this.tipoAr(),
      landmarks: landmarkDict,
    };

    this.http.post<any>(`${environment.apiUrl}/v1/productos/${this.codigo()}/landmarks`, body).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCalibrated.set(true);
        this.showToast('✅ Calibración RA guardada correctamente');
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('❌ Error al guardar calibración RA');
      },
    });
  }

  showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3000);
  }
}
