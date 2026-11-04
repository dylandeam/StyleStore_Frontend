import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { ReportesService } from '../../core/services/reportes.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { User } from '../../core/models/user.model';
import { Sucursal } from '../../core/models/sucursal.model';
import { BrandingService } from '../../core/services/branding.service';
import { TenantService } from '../../core/services/tenant.service';
import { TenantSummary } from '../../core/models/tenant.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private reportesService = inject(ReportesService);
  private sucursalService = inject(SucursalService);
  private cdr = inject(ChangeDetectorRef);
  readonly branding = inject(BrandingService);
  private tenantService = inject(TenantService);

  user = signal<User | null>(this.authService.currentUser());
  isLoading = signal<boolean>(!this.authService.currentUser());
  errorMessage = signal<string | null>(null);

  // Sucursales y Filtro
  sucursales: Sucursal[] = [];
  selectedSucursalId: number | null = null;

  // Estadísticas del Dashboard
  stats: any = null;
  loadingStats: boolean = false;
  predictions: any = null;
  predictionsLocked = false;
  loadingPredictions = false;
  indicatorDetail = signal<any | null>(null);
  indicatorLoading = signal(false);
  indicatorError = signal<string | null>(null);
  saasTenants = signal<TenantSummary[]>([]);
  loadingSaasTenants = signal(false);
  private saasDashboardLoaded = false;

  ngOnInit(): void {
    if (this.user() && this.isPlatformAdmin) {
      this.loadSaasDashboard();
    } else if (this.user() && this.isStaff) {
      this.loadDashboardStats();
    }
    this.loadProfile();
    if (!this.isPlatformAdmin) this.loadSucursales();
  }

  loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user.set(profile);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        if (this.isPlatformAdmin) {
          this.loadSaasDashboard();
        } else if (this.isStaff) {
          this.loadDashboardStats();
          if (!this.sucursales.length) this.loadSucursales();
        }
      },
      error: (err) => {
        if (!this.user()) {
          this.errorMessage.set(err.error?.detail || 'No se pudo cargar el perfil.');
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadSaasDashboard(): void {
    if (!this.isPlatformAdmin || this.loadingSaasTenants() || this.saasDashboardLoaded) return;
    this.loadingSaasTenants.set(true);
    this.tenantService.list().subscribe({
      next: (items) => {
        this.saasTenants.set(items || []);
        this.saasDashboardLoaded = true;
        this.loadingSaasTenants.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingSaasTenants.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  get saasActiveTenants(): number {
    return this.saasTenants().filter((tenant) => tenant.active).length;
  }

  get saasTotalBranches(): number {
    return this.saasTenants().reduce((total, tenant) => total + (tenant.sucursales_count || 0), 0);
  }

  get saasTotalUsers(): number {
    return this.saasTenants().reduce((total, tenant) => total + (tenant.usuarios_count || 0), 0);
  }

  get saasSubscriptionsAtRisk(): number {
    return this.saasTenants().filter((tenant) => {
      const status = (tenant.suscripcion?.estado || '').toLowerCase();
      const payment = (tenant.suscripcion?.estado_pago || '').toLowerCase();
      return !tenant.suscripcion || !tenant.active || status.includes('venc') || payment.includes('pend');
    }).length;
  }

  subscriptionLabel(tenant: TenantSummary): string {
    if (!tenant.suscripcion) return 'Sin plan';
    return tenant.suscripcion.plan_nombre || tenant.suscripcion.plan_codigo;
  }

  subscriptionStatus(tenant: TenantSummary): string {
    if (!tenant.active) return 'Inactivo';
    if (!tenant.suscripcion) return 'Sin suscripción';
    const payment = (tenant.suscripcion.estado_pago || '').toLowerCase();
    if (payment.includes('pend')) return 'Pago pendiente';
    return 'Operativo';
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data || [];
        this.cdr.markForCheck();
        this.loadPredictions();
      },
      error: (err) => console.error('Error cargando sucursales en dashboard:', err),
    });
  }

  loadPredictions(): void {
    if (!this.isStaff) return;
    this.loadingPredictions = true;
    this.reportesService.getPredicciones(this.selectedSucursalId || undefined).subscribe({
      next: (data) => {
        this.predictions = data;
        this.predictionsLocked = false;
        this.loadingPredictions = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.predictions = null;
        this.predictionsLocked = err.status === 403;
        this.loadingPredictions = false;
        this.cdr.markForCheck();
      },
    });
  }

  forecastWidth(value: number): number {
    const rows = this.predictions?.pronostico_7_dias || [];
    const maximum = Math.max(...rows.map((item: any) => item.ingresos_estimados || 0), 1);
    return Math.max(3, Math.round((value / maximum) * 100));
  }

  loadDashboardStats(): void {
    if (!this.isStaff) return;
    this.loadingStats = true;
    this.cdr.markForCheck();

    this.reportesService.getDashboardStats(this.selectedSucursalId || undefined).subscribe({
      next: (data) => {
        this.stats = data;
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSucursalChange(): void {
    if (this.isStaff) {
      this.loadDashboardStats();
      if (this.indicatorDetail()?.indicador) {
        this.openIndicator(this.indicatorDetail().indicador);
      }
    }
  }

  openIndicator(indicator: 'ventas_sucursal' | 'stock_categoria' | 'historial_compras'): void {
    this.indicatorLoading.set(true);
    this.indicatorError.set(null);
    this.reportesService.getDashboardIndicator(indicator, this.selectedSucursalId || undefined).subscribe({
      next: (detail) => {
        this.indicatorDetail.set(detail);
        this.indicatorLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.indicatorError.set(err.error?.detail || 'No se pudo cargar el detalle del indicador.');
        this.indicatorLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  closeIndicator(): void {
    this.indicatorDetail.set(null);
    this.indicatorError.set(null);
  }

  indicatorBarWidth(value: number): number {
    const rows = this.indicatorDetail()?.grafico || [];
    const maximum = Math.max(...rows.map((item: any) => Number(item.value) || 0), 1);
    return Math.max(value > 0 ? 4 : 0, Math.round(((Number(value) || 0) / maximum) * 100));
  }

  formatIndicatorValue(value: unknown): string {
    return typeof value === 'number'
      ? new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(value)
      : String(value ?? '—');
  }

  get isStaff(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('encargado') || role.includes('cajero') || role.includes('repartidor');
  }

  get isPlatformAdmin(): boolean {
    return !!this.user()?.is_platform_admin;
  }

  get isCliente(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role === 'cliente' || (!this.isStaff && !!this.user());
  }
}
