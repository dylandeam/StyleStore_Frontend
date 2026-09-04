import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoleService } from '../../../../core/services/role.service';
import { Permission } from '../../../../core/models/role.model';

@Component({
  selector: 'app-rol-permisos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rol-permisos.component.html',
  styleUrls: ['./rol-permisos.component.css'],
})
export class RolPermisosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private roleService = inject(RoleService);

  roleName = signal<string>('');
  allPermissions = signal<Permission[]>([]);
  selectedCodes = signal<Set<string>>(new Set());
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const role = this.route.snapshot.paramMap.get('role');
    if (role) {
      this.roleName.set(role);
      this.loadPermissions(role);
    }
  }

  loadPermissions(role: string): void {
    this.isLoading.set(true);
    // Fetch all available permissions
    this.roleService.getAllPermissions().subscribe({
      next: (all) => {
        this.allPermissions.set(all);
        // Fetch current role permissions
        this.roleService.getRolePermissions(role).subscribe({
          next: (res) => {
            const codeSet = new Set(res.permissions.map((p) => p.code));
            this.selectedCodes.set(codeSet);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
      },
      error: () => this.isLoading.set(false),
    });
  }

  get modules(): string[] {
    const mods = new Set(this.allPermissions().map((p) => p.module));
    return Array.from(mods);
  }

  getPermissionsByModule(module: string): Permission[] {
    return this.allPermissions().filter((p) => p.module === module);
  }

  isPermissionChecked(code: string): boolean {
    return this.selectedCodes().has(code);
  }

  togglePermission(code: string): void {
    const current = new Set(this.selectedCodes());
    if (current.has(code)) {
      current.delete(code);
    } else {
      current.add(code);
    }
    this.selectedCodes.set(current);
  }

  saveChanges(): void {
    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const codesArray = Array.from(this.selectedCodes());
    this.roleService
      .updateRolePermissions(this.roleName(), codesArray)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Permisos actualizados correctamente en el sistema y registrados en bitácora.');
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al guardar los permisos.');
        },
      });
  }
}
