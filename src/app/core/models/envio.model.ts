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
}
