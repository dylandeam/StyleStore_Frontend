export interface Envio {
  id: number;
  orden_venta_id: number;
  direccion: string;
  ciudad: string;
  referencia?: string;
  ubicacion_url?: string;
  costo: number;
  estado: string;
  fecha: string;
  created_at: string;
  cliente_nombre?: string;
  // Legacy compatibility
  yango_tracking_code?: string;
  yango_tracking_url?: string;
  // New delivery tracking
  tracking_code?: string;
  tracking_url?: string;
  tracking_activo?: boolean;
  token_seguimiento?: string;
  delivery_conductor?: string;
  repartidor_lat?: number;
  repartidor_lon?: number;
  repartidor_nombre?: string;
  repartidor_actualizado_en?: string;
  latitud_destino?: number;
  longitud_destino?: number;
}

export interface EnvioCreate {
  orden_venta_id: number;
  direccion: string;
  ciudad: string;
  referencia?: string;
  ubicacion_url?: string;
  distancia_km?: number;
  costo?: number;
  latitud_destino?: number;
  longitud_destino?: number;
}

export interface EnvioUpdate {
  direccion?: string;
  ciudad?: string;
  referencia?: string;
  ubicacion_url?: string;
  costo?: number;
  estado?: string;
  delivery_conductor?: string;
  latitud_destino?: number;
  longitud_destino?: number;
}

export interface EnvioDeliveryUpdate {
  delivery_conductor?: string;
  estado?: string;
  tracking_code?: string;
  tracking_url?: string;
}
