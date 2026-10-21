export interface EmpleadoSucursalAsignacion {
  id?: number;
  sucursal_id: number;
  sucursal_nombre?: string | null;
  hora_inicio: string;
  hora_fin: string;
  dias_semana: string[];
}

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
  empresa_id?: number | null;
  empresa_nombre?: string | null;
  jornada_tipo: 'tiempo_completo' | 'medio_tiempo';
  asignaciones: EmpleadoSucursalAsignacion[];
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
  jornada_tipo?: 'tiempo_completo' | 'medio_tiempo';
  asignaciones?: EmpleadoSucursalAsignacion[];
}

export interface EmpleadoUpdate {
  nombre?: string;
  apellido?: string;
  ci?: string;
  role?: string | null;
  sucursal_id?: number;
  edad?: number;
  sueldo?: number;
  telefono?: string;
  direccion?: string;
  foto?: string | null;
  active?: boolean;
  jornada_tipo?: 'tiempo_completo' | 'medio_tiempo';
  asignaciones?: EmpleadoSucursalAsignacion[];
}
