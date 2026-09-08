export interface Proveedor {
  codigo: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProveedorCreate {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

export interface ProveedorUpdate {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}
