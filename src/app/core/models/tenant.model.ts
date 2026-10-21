import { PlanCode } from './plan.model';

export interface TenantAdmin {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface TenantSubscription {
  id: number;
  plan_codigo: PlanCode;
  plan_nombre: string;
  estado: string;
  estado_pago: string;
  referencia_pago?: string | null;
  pagado_en?: string | null;
  precio: number;
  moneda: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  max_sucursales?: number | null;
}

export interface TenantSummary {
  id: number;
  codigo: string;
  nombre: string;
  active: boolean;
  inactive_reason?: string | null;
  created_at: string;
  updated_at: string;
  admin?: TenantAdmin | null;
  suscripcion?: TenantSubscription | null;
  usuarios_count: number;
  sucursales_count: number;
}

export interface TenantCreate {
  codigo: string;
  nombre: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  plan_codigo: PlanCode;
}
