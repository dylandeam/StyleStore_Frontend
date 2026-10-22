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

export interface TenantCapacidades {
  chatbot: boolean;
  predicciones: boolean;
  max_sucursales?: number | null;
  cupo_sucursales_disponible?: number | null;
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
  archivos_count?: number;
  proximamente_count?: number;
  pruebas_virtuales_count?: number;
  capacidades?: TenantCapacidades | null;
  sucursales: Array<{ id: number; nombre: string; ciudad: string; active: boolean }>;
  usuarios: Array<{ id: number; nombre: string; email: string; rol: string; active: boolean }>;
}

export interface TenantCreate {
  codigo: string;
  nombre: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  plan_codigo: PlanCode;
}
