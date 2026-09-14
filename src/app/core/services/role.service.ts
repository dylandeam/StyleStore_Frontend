import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RoleItem,
  RolePermissions,
  Permission,
  UpdateRolePermissionsRequest,
} from '../models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roles`;

  getRoles(): Observable<RoleItem[]> {
    return this.http.get<RoleItem[]>(this.apiUrl);
  }

  createRole(data: { nombre: string; descripcion?: string }): Observable<RoleItem> {
    return this.http.post<RoleItem>(this.apiUrl, data);
  }

  updateRole(id: number, data: { nombre?: string; descripcion?: string; active?: boolean }): Observable<RoleItem> {
    return this.http.put<RoleItem>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions/all`);
  }

  getRolePermissions(roleIdOrName: string | number): Observable<RolePermissions> {
    return this.http.get<RolePermissions>(`${this.apiUrl}/${roleIdOrName}/permissions`);
  }

  updateRolePermissions(
    roleIdOrName: string | number,
    permissionCodes: string[]
  ): Observable<RolePermissions> {
    const body: UpdateRolePermissionsRequest = {
      permission_codes: permissionCodes,
    };
    return this.http.put<RolePermissions>(
      `${this.apiUrl}/${roleIdOrName}/permissions`,
      body
    );
  }
}
