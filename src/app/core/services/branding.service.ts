import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantBranding } from '../models/auth.model';
import { UploadService } from './upload.service';

export type BrandingUpdate = Omit<TenantBranding, 'id' | 'codigo' | 'nombre'>;

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly uploads = inject(UploadService);
  private readonly url = `${environment.apiUrl}/empresas`;

  readonly brand = signal<TenantBranding | null>(null);

  loadPublic(code: string): Observable<TenantBranding> {
    return this.http.get<TenantBranding>(`${this.url}/publicas/${encodeURIComponent(code)}/portal`).pipe(
      tap((brand) => this.apply(brand))
    );
  }

  loadCurrent(): Observable<TenantBranding> {
    return this.http.get<TenantBranding>(`${this.url}/branding/mia`).pipe(
      tap((brand) => this.apply(brand))
    );
  }

  update(payload: BrandingUpdate): Observable<TenantBranding> {
    return this.http.put<TenantBranding>(`${this.url}/branding/mia`, payload).pipe(
      tap((brand) => this.apply(brand))
    );
  }

  logoUrl(brand: TenantBranding | null = this.brand()): string {
    return this.uploads.getImageUrl(brand?.logo_url, 'logos') || '/assets/images/logo.jpg';
  }

  apply(brand: TenantBranding): void {
    this.brand.set(brand);
    const root = this.document.documentElement;
    const onPrimary = this.contrast(brand.color_primario);
    root.style.setProperty('--accent-primary', brand.color_primario);
    root.style.setProperty('--accent-hover', brand.color_primario);
    root.style.setProperty('--bg-sidebar', brand.color_primario);
    root.style.setProperty('--bg-sidebar-active', brand.color_acento);
    root.style.setProperty('--border-focus', brand.color_primario);
    root.style.setProperty('--accent-link', brand.color_acento);
    root.style.setProperty('--bg-primary', brand.color_fondo);
    root.style.setProperty('--bg-decor', brand.color_secundario);
    root.style.setProperty('--bg-card', brand.color_secundario);
    root.style.setProperty('--text-primary', brand.color_texto);
    root.style.setProperty('--text-on-navy', onPrimary);
    this.document.title = `${brand.nombre_marca} · Portal`;
  }

  reset(): void {
    this.brand.set(null);
    const defaults: Record<string, string> = {
      '--accent-primary': '#14263D', '--accent-hover': '#0F1E30', '--bg-sidebar': '#14263D',
      '--bg-sidebar-active': '#1D3552', '--border-focus': '#14263D', '--accent-link': '#274C77',
      '--bg-primary': '#EEE7D8', '--bg-decor': '#E5DDCC', '--bg-card': '#FBF8F1',
      '--text-primary': '#172536', '--text-on-navy': '#FFFFFF',
    };
    Object.entries(defaults).forEach(([key, value]) => this.document.documentElement.style.setProperty(key, value));
    this.document.title = 'StyleStore';
  }

  private contrast(hex: string): string {
    const value = hex.replace('#', '');
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#172536' : '#FFFFFF';
  }
}
