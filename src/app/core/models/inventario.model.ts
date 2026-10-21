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
