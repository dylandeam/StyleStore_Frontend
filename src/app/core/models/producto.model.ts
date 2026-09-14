import { Color } from './color.model';

export interface Producto {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  foto?: string | null;
  precio: number;
  categoria_id: number;
  categoria_nombre?: string | null;
  temporada_id: number;
  temporada_nombre?: string | null;
  coleccion_id?: number | null;
  coleccion_nombre?: string | null;
  visible_en_catalogo?: boolean;
  active: boolean;
  colores?: Color[];
  stock_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductoCreate {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  foto?: string;
  precio: number;
  categoria_id: number;
  temporada_id: number;
  coleccion_id?: number | null;
  visible_en_catalogo?: boolean;
  color_ids?: number[];
  active?: boolean;
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string;
  foto?: string;
  precio?: number;
  categoria_id?: number;
  temporada_id?: number;
  coleccion_id?: number | null;
  visible_en_catalogo?: boolean;
  color_ids?: number[];
  active?: boolean;
}
