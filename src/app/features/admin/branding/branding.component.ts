import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BrandingService, BrandingUpdate } from '../../../core/services/branding.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.css',
})
export class BrandingComponent implements OnInit {
  readonly branding = inject(BrandingService);
  private readonly uploads = inject(UploadService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  form: BrandingUpdate = {
    nombre_marca: '', eslogan: '', logo_url: null,
    color_primario: '#14263D', color_secundario: '#FBF8F1', color_acento: '#274C77',
    color_fondo: '#EEE7D8', color_texto: '#172536', color_texto_contraste: '#FFFFFF',
  };

  ngOnInit(): void {
    this.branding.loadCurrent().subscribe({
      next: (brand) => {
        this.form = {
          nombre_marca: brand.nombre_marca,
          eslogan: brand.eslogan || '',
          logo_url: brand.logo_url || null,
          color_primario: brand.color_primario,
          color_secundario: brand.color_secundario,
          color_acento: brand.color_acento,
          color_fondo: brand.color_fondo,
          color_texto: brand.color_texto,
          color_texto_contraste: brand.color_texto_contraste || '#FFFFFF',
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'No se pudo cargar la identidad de la empresa.');
        this.loading.set(false);
      },
    });
  }

  uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      this.error.set('El logo debe ser una imagen de hasta 5 MB.');
      input.value = '';
      return;
    }
    this.error.set(null);
    this.uploading.set(true);
    this.uploads.uploadImage(file, 'logos').subscribe({
      next: (result) => {
        this.form.logo_url = result.url;
        this.uploading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'No se pudo subir el logo.');
        this.uploading.set(false);
      },
    });
  }

  logoPreview(): string {
    return this.uploads.getImageUrl(this.form.logo_url, 'logos') || '/assets/images/logo.jpg';
  }

  preview(): void {
    const current = this.branding.brand();
    if (!current) return;
    this.branding.apply({ ...current, ...this.form, eslogan: this.form.eslogan || null });
  }

  previewText(background: string, preferred: string): string {
    return this.branding.readableText(background, preferred);
  }

  contrastLabel(background: string, foreground: string): string {
    const ratio = this.branding.contrastRatio(background, foreground);
    return ratio >= 4.5 ? `Contraste correcto · ${ratio.toFixed(1)}:1` : `Se ajustará automáticamente · ${ratio.toFixed(1)}:1`;
  }

  hasLowContrast(background: string, foreground: string): boolean {
    return this.branding.contrastRatio(background, foreground) < 4.5;
  }

  save(): void {
    if (this.form.nombre_marca.trim().length < 2 || this.uploading()) return;
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.branding.update({
      ...this.form,
      nombre_marca: this.form.nombre_marca.trim(),
      eslogan: this.form.eslogan?.trim() || null,
      logo_url: this.form.logo_url || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Identidad visual guardada y aplicada en todo el portal.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.detail || 'No fue posible guardar la identidad.');
      },
    });
  }

  async copyPortal(kind: 'login' | 'registro'): Promise<void> {
    const code = this.branding.brand()?.codigo;
    if (!code) return;
    const url = `${window.location.origin}/t/${encodeURIComponent(code)}/${kind}`;
    try {
      await navigator.clipboard.writeText(url);
      this.success.set(`Enlace de ${kind} copiado.`);
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  }
}
