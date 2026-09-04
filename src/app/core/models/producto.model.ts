export interface Producto {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductoCreate {
  name: string;
  description?: string;
  category: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  active?: boolean;
}
