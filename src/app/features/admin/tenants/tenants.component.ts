import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PlanCode } from '../../../core/models/plan.model';
import { TenantCreate, TenantSummary } from '../../../core/models/tenant.model';
import { TenantService } from '../../../core/services/tenant.service';

type ModalMode = 'create' | 'company' | 'admin' | 'subscription';

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
  readonly modalMode = signal<ModalMode | null>(null);
  readonly selected = signal<TenantSummary | null>(null);
  readonly expandedTenantId = signal<number | null>(null);

  createForm: TenantCreate = this.emptyCreateForm();
  companyForm = { codigo: '', nombre: '' };
  adminForm = { name: '', email: '', password: '', is_active: true };
  subscriptionForm = {
    plan_codigo: 'basico' as PlanCode, estado: 'activa', fecha_inicio: '', fecha_fin: '',
    pago_confirmado: true, referencia_pago: '',
  };

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

  openSubscription(tenant: TenantSummary): void {
    this.selected.set(tenant);
    const start = tenant.suscripcion?.fecha_inicio || this.dateOffset(0);
    this.subscriptionForm = {
      plan_codigo: tenant.suscripcion?.plan_codigo || 'basico',
      estado: tenant.suscripcion?.estado || 'activa',
      fecha_inicio: start,
      fecha_fin: tenant.suscripcion?.fecha_fin || this.dateOffset(30),
      pago_confirmado: true,
      referencia_pago: '',
    };
    this.modalMode.set('subscription');
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
          : mode === 'subscription' && tenant
            ? this.tenantService.updateSubscription(tenant.id, this.subscriptionForm)
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

  private emptyCreateForm(): TenantCreate {
    return { codigo: '', nombre: '', admin_email: '', admin_name: '', admin_password: '', plan_codigo: 'basico' };
  }

  private dateOffset(days: number): string {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value.toISOString().slice(0, 10);
  }
}
