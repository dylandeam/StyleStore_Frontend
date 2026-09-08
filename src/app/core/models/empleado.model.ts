export interface Empleado {
  codigo: string;
  user_id: number;
  sucursal_id: number;
  edad: number;
  sueldo: number;
  telefono: string;
  direccion: string;
  foto?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  ci?: string | null;
  email?: string | null;
  role?: string | null;
  sucursal_nombre?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmpleadoCreate {
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  password?: string;
  role?: string;
  sucursal_id: number;
  edad: number;
  sueldo: number;
  telefono: string;
  direccion: string;
  foto?: string | null;
}

export interface EmpleadoUpdate {
  nombre?: string;
  apellido?: string;
  ci?: string;
  sucursal_id?: number;
  edad?: number;
  sueldo?: number;
  telefono?: string;
  direccion?: string;
  foto?: string | null;
  active?: boolean;
}
