export interface SimpleItem {
  id: number;
  nombre: string;
}

export interface Proveedor {
  codigo: string;
  ci?: string | null;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  categorias?: SimpleItem[];
  temporadas?: SimpleItem[];
  colecciones?: SimpleItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ProveedorCreate {
  ci?: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  categoria_ids?: number[];
  temporada_ids?: number[];
  coleccion_ids?: number[];
}

export interface ProveedorUpdate {
  ci?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  categoria_ids?: number[];
  temporada_ids?: number[];
  coleccion_ids?: number[];
}
