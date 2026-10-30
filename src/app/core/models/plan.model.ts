export type PlanCode = string;

export interface SubscriptionPlan {
  id: number;
  empresa_id: number | null;
  codigo: PlanCode;
  nombre: string;
  descripcion?: string | null;
  precio_mensual: number | string;
  moneda: string;
  max_sucursales?: number | null;
  ia_generativa: boolean;
  beneficios: string[];
  capacidades: Record<string, boolean>;
  estilo: Record<string, unknown>;
  active: boolean;
  updated_at: string;
}

export interface PlanContract {
  id: number;
  plan_codigo: PlanCode;
  plan_nombre: string;
  estado: string;
  estado_pago: string;
  referencia_pago?: string | null;
  pagado_en?: string | null;
  precio: string;
  moneda: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  created_at: string;
  max_sucursales?: number | null;
  capacidades?: Record<string, boolean>;
}

export interface EmpresaOption {
  id: number;
  codigo: string;
  nombre: string;
  active: boolean;
}

export interface PlanPayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
  contratacion_id: number;
  plan_codigo: PlanCode;
  total: number;
  moneda: string;
}

export interface PlanSubscriptionSummary {
  plan_codigo: string;
  plan_nombre: string;
  total: number;
  activas: number;
}

export interface TenantPlanSubscription {
  empresa_id: number;
  empresa_codigo: string;
  empresa_nombre: string;
  empresa_activa: boolean;
  plan_codigo?: string | null;
  plan_nombre?: string | null;
  estado: string;
  estado_pago: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  dias_restantes?: number | null;
  precio?: string | null;
  moneda?: string | null;
}

export interface PlanSubscriptionsOverview {
  planes: PlanSubscriptionSummary[];
  tenants: TenantPlanSubscription[];
}
