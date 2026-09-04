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

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions/all`);
  }

  getRolePermissions(role: string): Observable<RolePermissions> {
    return this.http.get<RolePermissions>(`${this.apiUrl}/${role}/permissions`);
  }

  updateRolePermissions(
    role: string,
    permissionCodes: string[]
  ): Observable<RolePermissions> {
    const body: UpdateRolePermissionsRequest = {
      permission_codes: permissionCodes,
    };
    return this.http.put<RolePermissions>(
      `${this.apiUrl}/${role}/permissions`,
      body
    );
  }
}
