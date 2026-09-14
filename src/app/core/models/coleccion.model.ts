export interface Coleccion {
  id: number;
  nombre: string;
  descripcion?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
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
