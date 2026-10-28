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
    const primary = this.safeHex(brand.color_primario, '#14263D');
    const surface = this.safeHex(brand.color_secundario, '#FBF8F1');
    const accent = this.safeHex(brand.color_acento, '#274C77');
    const page = this.safeHex(brand.color_fondo, '#EEE7D8');
    const preferredText = this.safeHex(brand.color_texto, '#172536');
    const preferredContrast = this.safeHex(brand.color_texto_contraste, '#FFFFFF');
    const onPage = this.readableText(page, preferredText);
    const onSurface = this.readableText(surface, preferredText);
    const onPrimary = this.readableText(primary, preferredContrast);
    const onAccent = this.readableText(accent, preferredContrast);
    const controlSurface = '#FFFFFF';
    const noticeSurface = '#FFFBEB';
    const onControl = this.readableText(controlSurface, preferredText);
    const onNotice = this.readableText(noticeSurface, preferredText);
    const link = this.contrastRatio(accent, surface) >= 4.5
      ? accent
      : this.readableText(surface, primary);

    const tokens: Record<string, string> = {
      '--accent-primary': primary,
      '--accent-hover': primary,
      '--accent-link': link,
      '--bg-primary': page,
      '--bg-decor': surface,
      '--bg-card': surface,
      '--bg-sidebar': primary,
      '--bg-sidebar-active': accent,
      '--border-focus': primary,
      '--surface-page': page,
      '--surface-card': surface,
      '--surface-contrast': primary,
      '--surface-control': controlSurface,
      '--surface-notice': noticeSurface,
      '--bg-card-hover': this.mix(onSurface, surface, 8),
      '--border-subtle': this.mix(onSurface, surface, 20),
      '--border-sidebar': this.mix(onPrimary, primary, 30),
      '--text-primary': onSurface,
      '--text-secondary': this.accessibleMix(onSurface, surface, 72),
      '--text-muted': this.accessibleMix(onSurface, surface, 60),
      '--text-placeholder': '#6B7280',
      '--text-on-page': onPage,
      '--text-on-card': onSurface,
      '--text-on-navy': onPrimary,
      '--text-on-navy-soft': this.mix(onPrimary, primary, 82),
      '--text-on-navy-muted': this.mix(onPrimary, primary, 68),
      '--text-on-accent': onAccent,
      '--text-on-control': onControl,
      '--text-on-control-soft': this.accessibleMix(onControl, controlSurface, 68),
      '--text-on-notice': onNotice,
      '--text-on-notice-soft': this.accessibleMix(onNotice, noticeSurface, 68),
      '--input-text': onControl,
    };
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    this.document.title = `${brand.nombre_marca} · Portal`;
  }

  reset(): void {
    this.brand.set(null);
    const defaults: Record<string, string> = {
      '--accent-primary': '#14263D', '--accent-hover': '#0F1E30', '--bg-sidebar': '#14263D',
      '--bg-sidebar-active': '#1D3552', '--border-focus': '#14263D', '--accent-link': '#274C77',
      '--bg-primary': '#EEE7D8', '--bg-decor': '#E5DDCC', '--bg-card': '#FBF8F1',
      '--surface-page': '#EEE7D8', '--surface-card': '#FBF8F1', '--surface-contrast': '#14263D',
      '--surface-control': '#FFFFFF', '--surface-notice': '#FFFBEB',
      '--bg-card-hover': '#F3EEE1', '--border-subtle': '#D9D0BF', '--border-sidebar': '#41536A',
      '--text-primary': '#172536', '--text-secondary': '#6F756F', '--text-muted': '#8E928D',
      '--text-on-page': '#172536', '--text-on-card': '#172536', '--text-on-navy': '#FFFFFF',
      '--text-on-navy-soft': '#D2D9E0', '--text-on-navy-muted': '#AEB8C4',
      '--text-on-accent': '#FFFFFF', '--input-text': '#172536',
      '--text-on-control': '#172536', '--text-on-control-soft': '#536171',
      '--text-on-notice': '#172536', '--text-on-notice-soft': '#625A49',
    };
    Object.entries(defaults).forEach(([key, value]) => this.document.documentElement.style.setProperty(key, value));
    this.document.title = 'StyleStore';
  }

  readableText(background: string, preferred: string): string {
    const bg = this.safeHex(background, '#FFFFFF');
    const requested = this.safeHex(preferred, '#172536');
    if (this.contrastRatio(bg, requested) >= 4.5) return requested;
    return ['#FFFFFF', '#000000', '#172536']
      .map((color) => ({ color, ratio: this.contrastRatio(bg, color) }))
      .sort((first, second) => second.ratio - first.ratio)[0].color;
  }

  contrastRatio(first: string, second: string): number {
    const firstLuminance = this.luminance(this.safeHex(first, '#FFFFFF'));
    const secondLuminance = this.luminance(this.safeHex(second, '#172536'));
    const light = Math.max(firstLuminance, secondLuminance);
    const dark = Math.min(firstLuminance, secondLuminance);
    return (light + 0.05) / (dark + 0.05);
  }

  private safeHex(value: string | null | undefined, fallback: string): string {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? String(value).toUpperCase() : fallback;
  }

  private luminance(hex: string): number {
    const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  private mix(foreground: string, background: string, foregroundPercent: number): string {
    const weight = Math.max(0, Math.min(100, foregroundPercent)) / 100;
    const channel = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
    const mixed = [1, 3, 5].map((index) => Math.round(
      channel(foreground, index) * weight + channel(background, index) * (1 - weight)
    ));
    return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  private accessibleMix(foreground: string, background: string, foregroundPercent: number): string {
    const mixed = this.mix(foreground, background, foregroundPercent);
    return this.contrastRatio(mixed, background) >= 4.5 ? mixed : foreground;
  }
}
