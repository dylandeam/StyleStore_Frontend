export interface Permission {
  id: number;
  code: string;
  module: string;
  description: string;
}

export interface RoleItem {
  role: string;
  permission_count: number;
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

export interface UpdateRolePermissionsRequest {
  permission_codes: string[];
}
