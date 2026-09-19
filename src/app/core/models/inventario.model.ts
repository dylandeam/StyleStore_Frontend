export interface InventarioItem {
  stock_inventario_id: number;
  id?: number;
  producto_codigo?: string;
  producto_nombre: string;
  foto?: string;
  precio?: number;
  precio_unitario?: number;
  categoria?: string;
  temporada?: string;
  coleccion?: string;
  producto_color_id?: number;
  color?: string;
  color_nombre?: string;
  talla_id?: number;
  talla?: string;
  talla_nombre?: string;
  sucursal_id?: number;
  sucursal?: string;
  cantidad: number;
  cantidad_disponible: number;
}

export interface StockAdjustRequest {
  stock_inventario_id?: number;
  producto_color_id?: number;
  talla_id?: number;
  sucursal_id?: number;
  cantidad: number;
}
