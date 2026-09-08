export interface Categoria {
  id: number;
  nombre: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoriaCreate {
  nombre: string;
}
