export interface StockInventarioItem {
  id?: number;
  color_id: number;
  producto_color_id?: number;
  talla_id: number;
  sucursal_id: number;
  cantidad: number;
  color_nombre?: string;
  talla_nombre?: string;
  sucursal_nombre?: string;
}

export interface StockBulkUpdateRequest {
  items: {
    color_id?: number;
    producto_color_id?: number;
    talla_id: number;
    sucursal_id: number;
    cantidad: number;
  }[];
}
