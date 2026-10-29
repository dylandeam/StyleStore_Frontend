import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoleService } from '../../../../core/services/role.service';
import { Permission } from '../../../../core/models/role.model';
import { PlatformTenantContextService } from '../../../../core/services/platform-tenant-context.service';

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
  readonly tenantContext = inject(PlatformTenantContextService);

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
    const priority = ['ventas', 'carrito', 'reservas', 'resenas', 'catalogo', 'promociones'];
    return Array.from(mods).sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b, 'es');
    });
  }

  get tenantName(): string {
    return this.tenantContext.selected()?.nombre || 'tu tenant';
  }

  get isCustomerRole(): boolean {
    return this.roleName() === 'cliente';
  }

  get operationalPermissions(): Permission[] {
    const codes = new Set(['ventas.comprar', 'carrito.usar', 'reservas.crear', 'resenas.crear', 'catalogo.ver']);
    return this.allPermissions().filter((permission) => codes.has(permission.code));
  }

  moduleLabel(module: string): string {
    const labels: Record<string, string> = {
      ventas: 'Ventas y pagos', carrito: 'Carrito', reservas: 'Reservas', resenas: 'Reseñas',
      catalogo: 'Catálogo', usuarios: 'Usuarios', roles: 'Roles y permisos', inventario: 'Inventario',
      promociones: 'Promociones', productos: 'Productos', sucursales: 'Sucursales', empleados: 'Empleados',
      clientes: 'Clientes', envios: 'Envíos', bitacora: 'Auditoría',
    };
    return labels[module] || module;
  }

  toggleModule(module: string, enabled: boolean): void {
    const current = new Set(this.selectedCodes());
    for (const permission of this.getPermissionsByModule(module)) {
      enabled ? current.add(permission.code) : current.delete(permission.code);
    }
    this.selectedCodes.set(current);
  }

  isModuleEnabled(module: string): boolean {
    const permissions = this.getPermissionsByModule(module);
    return permissions.length > 0 && permissions.every((permission) => this.selectedCodes().has(permission.code));
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
