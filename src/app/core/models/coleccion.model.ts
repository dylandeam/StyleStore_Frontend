export interface Coleccion {
  id: number;
  nombre: string;
  descripcion?: string;
  active: boolean;
  productos_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductoColeccion {
  codigo: string;
  nombre: string;
  descripcion?: string;
  foto?: string;
  precio: number;
  categoria?: string;
  temporada?: string;
  colores?: string[];
  coleccion_id?: number;
  coleccion_nombre?: string;
}

export interface ColeccionCreate {
  nombre: string;
  descripcion?: string;
}

export interface ColeccionUpdate {
  nombre?: string;
  descripcion?: string;
  active?: boolean;
}

