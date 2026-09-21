export interface DetalleCompraCreate {
  producto_codigo: string;
  producto_nombre?: string;
  color_id: number;
  color_nombre?: string;
  talla_id: number;
  talla_nombre?: string;
  cantidad: number;
  costo_unitario: number;
}

export interface DetalleCompra {
  id: number;
  producto_codigo: string;
  producto_nombre?: string;
  color_id: number;
  color_nombre?: string;
  talla_id: number;
  talla_nombre?: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface CompraCreate {
  proveedor_codigo: string;
  sucursal_id: number;
  nro_factura?: string;
  observaciones?: string;
  items: DetalleCompraCreate[];
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor_codigo: string;
  proveedor_nombre?: string;
  sucursal_id: number;
  sucursal_nombre?: string;
  nro_factura?: string;
  total: number;
  estado: string;
  observaciones?: string;
  created_at: string;
  detalles: DetalleCompra[];
}
