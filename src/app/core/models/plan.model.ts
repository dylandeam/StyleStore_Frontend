export type PlanCode = 'basico' | 'profesional' | 'personalizado';

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
