import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TenantCreate, TenantSummary } from '../../../core/models/tenant.model';
import { TenantService } from '../../../core/services/tenant.service';

type ModalMode = 'create' | 'company' | 'admin';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.css',
})
export class TenantsComponent implements OnInit {
  private readonly tenantService = inject(TenantService);

  readonly tenants = signal<TenantSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'suspended'>('all');
  readonly viewMode = signal<'cards' | 'matrix'>('cards');
  readonly modalMode = signal<ModalMode | null>(null);
  readonly selected = signal<TenantSummary | null>(null);
  readonly expandedTenantId = signal<number | null>(null);

  createForm: TenantCreate = this.emptyCreateForm();
  companyForm = { codigo: '', nombre: '' };
  adminForm = { name: '', email: '', password: '', is_active: true };

  readonly filteredTenants = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.tenants().filter((tenant) => {
      const matchesStatus = status === 'all' || (status === 'active' ? tenant.active : !tenant.active);
      const haystack = `${tenant.nombre} ${tenant.codigo} ${tenant.admin?.name || ''} ${tenant.admin?.email || ''}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  });

  readonly activeCount = computed(() => this.tenants().filter((item) => item.active).length);
  readonly branchCount = computed(() => this.tenants().reduce((sum, item) => sum + item.sucursales_count, 0));
  readonly userCount = computed(() => this.tenants().reduce((sum, item) => sum + item.usuarios_count, 0));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenantService.list().subscribe({
      next: (items) => { this.tenants.set(items); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudieron cargar los tenants.'); this.loading.set(false); },
    });
  }

  openCreate(): void {
    this.createForm = this.emptyCreateForm();
    this.selected.set(null);
    this.modalMode.set('create');
  }

  openCompany(tenant: TenantSummary): void {
    this.selected.set(tenant);
    this.companyForm = { codigo: tenant.codigo, nombre: tenant.nombre };
    this.modalMode.set('company');
  }

  openAdmin(tenant: TenantSummary): void {
    this.selected.set(tenant);
    this.adminForm = {
      name: tenant.admin?.name || '', email: tenant.admin?.email || '', password: '',
      is_active: tenant.admin?.is_active ?? true,
    };
    this.modalMode.set('admin');
  }

  closeModal(): void {
    if (!this.saving()) this.modalMode.set(null);
  }

  save(): void {
    const mode = this.modalMode();
    const tenant = this.selected();
    this.saving.set(true);
    this.error.set(null);
    const request = mode === 'create'
      ? this.tenantService.create(this.createForm)
      : mode === 'company' && tenant
        ? this.tenantService.update(tenant.id, this.companyForm)
        : mode === 'admin' && tenant
          ? this.tenantService.updateAdmin(tenant.id, {
              name: this.adminForm.name,
              email: this.adminForm.email,
              is_active: this.adminForm.is_active,
              ...(this.adminForm.password ? { password: this.adminForm.password } : {}),
            })
          : null;
    if (!request) { this.saving.set(false); return; }
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalMode.set(null);
        this.success.set(mode === 'create' ? 'Tenant y administrador creados correctamente.' : 'Cambios guardados correctamente.');
        this.load();
        setTimeout(() => this.success.set(null), 3500);
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.detail || 'No fue posible guardar los cambios.'); },
    });
  }

  toggleActive(tenant: TenantSummary): void {
    const action = tenant.active ? 'suspender' : 'reactivar';
    if (!confirm(`¿Deseas ${action} el tenant “${tenant.nombre}”?`)) return;
    this.tenantService.setActive(tenant.id, !tenant.active).subscribe({
      next: () => { this.success.set(`Tenant ${tenant.active ? 'suspendido' : 'reactivado'} correctamente.`); this.load(); },
      error: (err) => this.error.set(err?.error?.detail || 'No se pudo cambiar el estado.'),
    });
  }

  toggleDetails(tenant: TenantSummary): void {
    this.expandedTenantId.update((current) => current === tenant.id ? null : tenant.id);
  }

  async copyLoginLink(tenant: TenantSummary): Promise<void> {
    const url = `${window.location.origin}/t/${encodeURIComponent(tenant.codigo)}/login`;
    try {
      await navigator.clipboard.writeText(url);
      this.success.set(`Enlace de acceso de “${tenant.nombre}” copiado.`);
    } catch {
      window.prompt('Copia el enlace de acceso del tenant:', url);
    }
    setTimeout(() => this.success.set(null), 3500);
  }

  subscriptionClass(tenant: TenantSummary): string {
    const end = tenant.suscripcion?.fecha_fin;
    if (!tenant.active || tenant.suscripcion?.estado !== 'activa') return 'danger';
    if (end && new Date(`${end}T23:59:59`) < new Date()) return 'danger';
    return 'success';
  }

  tenantStatusLabel(tenant: TenantSummary): string {
    if (tenant.active) return 'Activo';
    if (tenant.inactive_reason === 'subscription_expired') return 'Inactivo por vencimiento';
    if (tenant.inactive_reason === 'payment_pending') return 'Pago pendiente';
    return 'Suspendido';
  }

  branchOccupancyPct(tenant: TenantSummary): number {
    const max = tenant.capacidades?.max_sucursales ?? tenant.suscripcion?.max_sucursales ?? 2;
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((tenant.sucursales_count / max) * 100));
  }

  branchOccupancyLabel(tenant: TenantSummary): string {
    const max = tenant.capacidades?.max_sucursales ?? tenant.suscripcion?.max_sucursales ?? 2;
    const count = tenant.sucursales_count;
    if (count >= max) return `${count} / ${max} (Límite alcanzado)`;
    return `${count} / ${max} (${max - count} disponibles)`;
  }

  planBadgeClass(tenant: TenantSummary): string {
    const code = (tenant.suscripcion?.plan_codigo || 'basico').toLowerCase();
    if (code.includes('profesional')) return 'plan-badge profesional';
    if (code.includes('intermedio')) return 'plan-badge intermedio';
    return 'plan-badge basico';
  }

  private emptyCreateForm(): TenantCreate {
    return { codigo: '', nombre: '', admin_email: '', admin_name: '', admin_password: '', plan_codigo: 'basico' };
  }

}
