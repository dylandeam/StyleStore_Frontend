import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EmpresaOption, PlanContract, SubscriptionPlan } from '../../core/models/plan.model';
import { AuthService } from '../../core/services/auth.service';
import { PlanesService } from '../../core/services/planes.service';

@Component({
  selector: 'app-planes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planes.component.html',
  styleUrl: './planes.component.css',
})
export class PlanesComponent implements OnInit {
  private readonly plansService = inject(PlanesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly companies = signal<EmpresaOption[]>([]);
  readonly myContract = signal<PlanContract | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editing = signal<SubscriptionPlan | null>(null);

  selectedEmpresaId?: number;
  benefitsText = '';
  primaryColor = '#7c3aed';
  accentColor = '#f59e0b';
  featured = false;
  readonly capabilityOptions = [
    { key: 'productos', label: 'Productos e inventario' },
    { key: 'ventas', label: 'Ventas y cobros' },
    { key: 'reservas', label: 'Reservas' },
    { key: 'offline', label: 'Operación offline' },
    { key: 'reportes', label: 'Reportes convencionales' },
  ];

  get isAdminView(): boolean {
    return this.router.url.startsWith('/admin/planes');
  }

  get isPlatformAdmin(): boolean {
    return !!this.authService.currentUser()?.is_platform_admin;
  }

  get canContract(): boolean {
    return this.authService.currentUser()?.role === 'administrador';
  }

  ngOnInit(): void {
    const load = () => {
      if (this.isPlatformAdmin && this.isAdminView) this.loadCompanies();
      this.loadPlans();
      if (!this.isAdminView || !this.isPlatformAdmin) this.loadContract();
    };
    if (this.authService.currentUser()) load();
    else this.authService.getProfile().subscribe({ next: load, error: () => this.loading.set(false) });
    const paypalToken = this.route.snapshot.queryParamMap.get('token');
    if (paypalToken && this.route.snapshot.queryParamMap.get('paypal_plan') === '1') {
      this.capturePlanPayment(paypalToken);
    }
  }

  loadPlans(): void {
    this.loading.set(true);
    this.error.set(null);
    const request = this.isAdminView && this.isPlatformAdmin
      ? this.plansService.getAdminPlans(this.selectedEmpresaId)
      : this.plansService.getPublicPlans();
    request.subscribe({
      next: (plans) => { this.plans.set(plans); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudieron cargar los planes.'); this.loading.set(false); },
    });
  }

  loadCompanies(): void {
    this.plansService.getCompanies().subscribe({ next: (items) => this.companies.set(items) });
  }

  loadContract(): void {
    this.plansService.getMyContract().subscribe({ next: (item) => this.myContract.set(item) });
  }

  edit(plan: SubscriptionPlan): void {
    this.editing.set({ ...plan, beneficios: [...plan.beneficios], estilo: { ...plan.estilo } });
    this.benefitsText = plan.beneficios.join('\n');
    this.primaryColor = String(plan.estilo['color_primario'] || '#7c3aed');
    this.accentColor = String(plan.estilo['color_acento'] || '#f59e0b');
    this.featured = !!plan.estilo['destacado'];
  }

  closeEditor(): void { this.editing.set(null); }

  save(): void {
    const plan = this.editing();
    if (!plan) return;
    this.saving.set(true);
    const payload = {
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      precio_mensual: plan.precio_mensual,
      moneda: plan.moneda,
      max_sucursales: plan.max_sucursales,
      ia_generativa: plan.ia_generativa,
      beneficios: this.benefitsText.split('\n').map((item) => item.trim()).filter(Boolean),
      capacidades: plan.capacidades,
      estilo: { color_primario: this.primaryColor, color_acento: this.accentColor, destacado: this.featured },
      active: plan.active,
    };
    this.plansService.updatePlan(plan.codigo, payload, this.selectedEmpresaId).subscribe({
      next: () => { this.saving.set(false); this.editing.set(null); this.message.set('Plan actualizado correctamente.'); this.loadPlans(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.detail || 'No se pudo actualizar el plan.'); },
    });
  }

  contract(plan: SubscriptionPlan): void {
    if (!confirm(`Serás enviado a PayPal para pagar ${plan.moneda} ${plan.precio_mensual}. El plan solo cambiará cuando PayPal confirme el cobro. ¿Continuar?`)) return;
    this.saving.set(true);
    this.error.set(null);
    const returnUrl = `${window.location.origin}/planes?paypal_plan=1`;
    const cancelUrl = `${window.location.origin}/planes?paypal_cancelado=1`;
    this.plansService.createPayPalOrder(plan.codigo, returnUrl, cancelUrl).subscribe({
      next: (order) => {
        const approval = order.links.find((link) => link.rel === 'approve')?.href;
        if (!approval) {
          this.saving.set(false);
          this.error.set('PayPal no devolvió un enlace de aprobación.');
          return;
        }
        window.location.assign(approval);
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.detail || 'No se pudo iniciar el pago con PayPal.'); },
    });
  }

  private capturePlanPayment(paypalOrderId: string): void {
    this.saving.set(true);
    this.message.set('Confirmando el cobro con PayPal…');
    this.plansService.capturePayPalOrder(paypalOrderId).subscribe({
      next: (contract) => {
        this.myContract.set(contract);
        this.saving.set(false);
        this.message.set(`Pago confirmado. El plan ${contract.plan_nombre} ya está activo.`);
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      },
      error: (err) => {
        this.saving.set(false);
        this.message.set(null);
        this.error.set(err?.error?.detail || 'PayPal no pudo confirmar el cobro; el plan anterior continúa sin cambios.');
      },
    });
  }

  planColor(plan: SubscriptionPlan): string {
    return String(plan.estilo?.['color_primario'] || (plan.codigo === 'profesional' ? '#7c3aed' : plan.codigo === 'basico' ? '#0f766e' : '#b45309'));
  }
}
