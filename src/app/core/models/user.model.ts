export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCreateByAdmin {
  email: string;
  name: string;
  password: string;
  role: 'cajero' | 'encargado_sucursal' | 'administrador';
}
