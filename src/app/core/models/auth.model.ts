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
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}
