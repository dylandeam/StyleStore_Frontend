export interface OutfitItemCreate {
  producto_codigo: string;
  tipo_prenda: 'superior' | 'inferior' | 'calzado' | 'accesorio' | string;
  precio?: number;
  stock_inventario_id?: number;
}

export interface OutfitItemResponse {
  id: number;
  producto_codigo: string;
  tipo_prenda: string;
  precio: number;
  producto_nombre?: string;
  producto_foto?: string;
  producto_precio?: number;
}

export interface OutfitCreate {
  nombre: string;
  descripcion?: string;
  items: OutfitItemCreate[];
}

export interface OutfitResponse {
  id: number;
  user_id: number;
  nombre: string;
  descripcion?: string;
  total: number;
  created_at: string;
  items: OutfitItemResponse[];
}

export interface BuyOutfitResult {
  message: string;
  outfit_id: number;
  items_agregados: string[];
  items_sin_stock: string[];
  total_carrito_items: number;
}
