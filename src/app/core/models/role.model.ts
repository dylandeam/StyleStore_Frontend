export interface Permission {
  id: number;
  code: string;
  module: string;
  description: string;
}

export interface RoleItem {
  id: number;
  nombre: string;
  descripcion?: string;
  active: boolean;
  role: string;
  permission_count: number;
  user_count?: number;
  created_at?: string;
}

export interface RolePermissions {
  id?: number;
  nombre?: string;
  role: string;
  permissions: Permission[];
}

export interface UpdateRolePermissionsRequest {
  permission_codes: string[];
}
