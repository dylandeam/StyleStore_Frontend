export interface Sucursal {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  maps_url?: string;
  ubicacion_url?: string;
  latitud?: number;
  longitud?: number;
  nombre?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SucursalCreate {
  name: string;
  city: string;
  address: string;
  phone: string;
  maps_url?: string;
  ubicacion_url?: string;
  latitud?: number;
  longitud?: number;
  active?: boolean;
}
