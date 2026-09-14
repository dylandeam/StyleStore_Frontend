export interface InventarioItem {
  stock_inventario_id: number;
  producto_codigo?: string;
  producto_nombre?: string;
  foto?: string;
  precio?: number;
  categoria?: string;
  temporada?: string;
  coleccion?: string;
  producto_color_id?: number;
  color?: string;
  talla_id?: number;
  talla?: string;
  sucursal_id?: number;
  sucursal?: string;
  cantidad: number;
}

export interface StockAdjustRequest {
  stock_inventario_id?: number;
  producto_color_id?: number;
  talla_id?: number;
  sucursal_id?: number;
  cantidad: number;
}
