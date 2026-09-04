export interface Bitacora {
  id: number;
  user_id?: number | null;
  user_snapshot: string;
  action: string;
  module?: string | null;
  created_at: string;
}

export interface BitacoraPageResponse {
  items: Bitacora[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
