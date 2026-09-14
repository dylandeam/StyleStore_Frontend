export interface User {
  id: number;
  email: string;
  name: string;
  nombre?: string;
  apellido?: string;
  ci?: string;
  telefono?: string;
  direccion?: string;
  foto?: string;
  role_id?: number;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCreateByAdmin {
  email: string;
  name: string;
  apellido?: string;
  ci?: string;
  password?: string;
  role: string;
  role_id?: number;
}
