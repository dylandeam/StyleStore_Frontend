export interface LoginRequest {
  email: string;
  password: string;
  empresa_codigo?: string;
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
  id: number;
  codigo: string;
  nombre: string;
  nombre_marca?: string | null;
  logo_url?: string | null;
  color_primario?: string;
  color_acento?: string;
}

export interface TenantBranding extends RegistrationCompany {
  nombre_marca: string;
  eslogan?: string | null;
  logo_url?: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  color_fondo: string;
  color_texto: string;
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
