import { Envio } from './envio.model';

export interface DetalleVenta {
  id: number;
  stock_inventario_id?: number;
  producto_codigo?: string;
  producto_nombre: string;
  color_nombre?: string;
  talla_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface OrdenVenta {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  subtotal_productos?: number;
  descuento_promociones?: number;
  descuento_codigo?: number;
  codigo_descuento?: string;
  porcentaje_codigo?: number;
  tipo_venta: string;
  metodo_pago?: string;
  ticket_numero?: string;
  sucursal_id?: number;
  sucursal_nombre?: string;
  sucursal_direccion?: string;
  codigo_cliente: string;
  cliente_nombre?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  sucursal_ciudad?: string;
  detalles: DetalleVenta[];
  envio?: Envio;
  created_at: string;
}

export interface VentaItemCreate {
  stock_inventario_id: number;
  cantidad: number;
}

export interface VentaPresencialCreate {
  codigo_cliente: string;
  sucursal_id: number;
  items: VentaItemCreate[];
  metodo_pago?: string;
  efectivo_recibido?: number;
  codigo_descuento?: string;
}

export interface PagoResponse {
  id: number;
  orden_venta_id: number;
  empresa_id?: number;
  monto: number;
  tipo_pago: string;
  estado: string;
  paypal_order_id?: string;
  recibo_numero?: string;
  email_confirmacion_enviado_at?: string;
  created_at: string;
}
