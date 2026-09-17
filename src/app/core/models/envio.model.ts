export interface Envio {
  id: number;
  orden_venta_id: number;
  direccion: string;
  ciudad: string;
  referencia?: string;
  costo: number;
  estado: string;
  fecha: string;
  created_at: string;
  cliente_nombre?: string;
  yango_tracking_code?: string;
  yango_tracking_url?: string;
  delivery_conductor?: string;
}

export interface EnvioCreate {
  orden_venta_id: number;
  direccion: string;
  ciudad: string;
  referencia?: string;
  distancia_km?: number;
  costo?: number;
}

export interface EnvioUpdate {
  direccion?: string;
  ciudad?: string;
  referencia?: string;
  costo?: number;
  estado?: string;
  yango_tracking_code?: string;
  yango_tracking_url?: string;
  delivery_conductor?: string;
}

export interface EnvioYangoUpdate {
  yango_tracking_code?: string;
  yango_tracking_url?: string;
  delivery_conductor?: string;
  estado?: string;
}
