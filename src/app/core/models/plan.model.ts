export type PlanCode = 'basico' | 'intermedio' | 'profesional';

export interface SubscriptionPlan {
  id: number;
  empresa_id: number | null;
  codigo: PlanCode;
  nombre: string;
  descripcion?: string | null;
  precio_mensual: string;
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
