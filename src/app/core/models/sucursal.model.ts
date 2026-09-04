export interface Sucursal {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SucursalCreate {
  name: string;
  city: string;
  address: string;
  phone: string;
  active?: boolean;
}
