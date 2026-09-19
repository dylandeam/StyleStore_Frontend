export interface DetalleReserva {
  id: number;
  stock_inventario_id: number;
  cantidad: number;
  producto_codigo?: string;
  producto_nombre?: string;
  color_nombre?: string;
  talla_nombre?: string;
  foto?: string;
}

export interface Reserva {
  id: number;
  fecha: string;
  hora: string;
  estado: string;
  codigo_cliente: string;
  cliente_nombre?: string;
  sucursal_id: number;
  sucursal_ciudad?: string;
  sucursal_direccion?: string;
  detalles: DetalleReserva[];
  created_at: string;
}

export interface ReservaCreateItem {
  stock_inventario_id: number;
  cantidad: number;
}

export interface ReservaCreate {
  sucursal_id: number;
  fecha_limite?: string;
  items: ReservaCreateItem[];
}
