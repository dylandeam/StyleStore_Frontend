export interface InventarioItem {
  stock_inventario_id: number;
  id?: number;
  producto_codigo?: string;
  producto_nombre: string;
  foto?: string;
  precio?: number;
  precio_unitario?: number;
  precio_variante?: number | null;
  medidas?: Record<string, number>;
  categoria?: string;
  categoria_nombre?: string;
  categoria_id?: number;
  temporada?: string;
  coleccion?: string;
  producto_color_id?: number;
  color?: string;
  color_nombre?: string;
  talla_id?: number;
  talla?: string;
  talla_nombre?: string;
  sucursal_id?: number;
  sucursal?: string;
  cantidad: number;
  cantidad_disponible: number;
}

export interface StockAdjustRequest {
  stock_inventario_id?: number;
  producto_color_id?: number;
  talla_id?: number;
  sucursal_id?: number;
  cantidad: number;
  precio_variante?: number | null;
  medidas?: Record<string, number>;
}

export type EstadoTraspaso = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

export interface TraspasoInventario {
  id: number;
  empresa_id: number;
  sucursal_origen_id: number;
  sucursal_origen: string;
  sucursal_destino_id: number;
  sucursal_destino: string;
  producto_color_id: number;
  producto_codigo: string;
  producto_nombre: string;
  color: string;
  talla_id: number;
  talla: string;
  cantidad: number;
  estado: EstadoTraspaso;
  idempotency_key: string;
  observacion?: string | null;
  respuesta?: string | null;
  solicitado_por: string;
  procesado_por?: string | null;
  created_at: string;
  procesado_en?: string | null;
}

export interface TraspasoCreateRequest {
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  producto_color_id: number;
  talla_id: number;
  cantidad: number;
  idempotency_key: string;
  observacion?: string;
}

export type PrioridadRecomendacionTraspaso = 'CRITICA' | 'ALTA' | 'MEDIA';

export interface RecomendacionTraspasoStock {
  producto_color_id: number;
  talla_id: number;
  producto: string;
  codigo: string;
  color: string;
  talla: string;
  sucursal_origen_id: number;
  sucursal_origen: string;
  stock_origen: number;
  stock_origen_efectivo: number;
  ventas_origen_30d: number;
  sucursal_destino_id: number;
  sucursal_destino: string;
  stock_destino: number;
  stock_destino_efectivo: number;
  ventas_destino_30d: number;
  dias_cobertura_destino: number;
  cantidad_recomendada: number;
  prioridad: PrioridadRecomendacionTraspaso;
  confianza_porcentaje: number;
  explicacion: string;
}

export interface RecomendacionesTraspasoResponse {
  tenant_id: number;
  sucursal_destino_id?: number | null;
  generado_en: string;
  dias_horizonte_analizado: number;
  total_variantes_evaluadas: number;
  total_recomendaciones: number;
  criterio: string;
  items: RecomendacionTraspasoStock[];
}
