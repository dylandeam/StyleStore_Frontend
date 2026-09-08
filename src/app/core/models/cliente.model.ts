export interface Cliente {
  codigo: string;
  user_id: number;
  telefono: string;
  direccion: string;
  nombre?: string | null;
  apellido?: string | null;
  ci?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteCreate {
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  password?: string;
  telefono: string;
  direccion: string;
}

export interface ClienteUpdate {
  nombre?: string;
  apellido?: string;
  ci?: string;
  telefono?: string;
  direccion?: string;
  active?: boolean;
}
