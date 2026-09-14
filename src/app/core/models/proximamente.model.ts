export interface Proximamente {
  id: number;
  nombre: string;
  descripcion?: string;
  foto?: string;
  fecha_estimada_llegada?: string;
  proveedor_codigo?: string;
  categoria_id?: number;
  temporada_id?: number;
  coleccion_id?: number;
  active: boolean;
  categoria_nombre?: string;
  temporada_nombre?: string;
  coleccion_nombre?: string;
  proveedor_nombre?: string;
  created_at: string;
  updated_at: string;
}

export interface ProximamenteCreate {
  nombre: string;
  descripcion?: string;
  foto?: string;
  fecha_estimada_llegada?: string;
  proveedor_codigo?: string;
  categoria_id?: number;
  temporada_id?: number;
  coleccion_id?: number;
}

export interface ProximamenteUpdate {
  nombre?: string;
  descripcion?: string;
  foto?: string;
  fecha_estimada_llegada?: string;
  proveedor_codigo?: string;
  categoria_id?: number;
  temporada_id?: number;
  coleccion_id?: number;
  active?: boolean;
}
