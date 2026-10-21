export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  apellido: string;
  ci: string;
  telefono: string;
  direccion: string;
  foto?: string | null;
  empresa_codigos: string[];
}

export interface RegistrationCompany {
  codigo: string;
  nombre: string;
}

export interface TenantAccess {
  id: number;
  codigo: string;
  nombre: string;
  active: boolean;
  is_current: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}
