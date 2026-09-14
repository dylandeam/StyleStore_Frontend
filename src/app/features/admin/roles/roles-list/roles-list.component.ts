import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../../core/services/role.service';
import { RoleItem } from '../../../../core/models/role.model';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
})
export class RolesListComponent implements OnInit {
  private roleService = inject(RoleService);

  roles = signal<RoleItem[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modal Crear / Editar Rol
  isModalOpen = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedRoleId = signal<number | null>(null);
  roleNombre = signal<string>('');
  roleDescripcion = signal<string>('');

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.roleService.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al cargar roles.');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.selectedRoleId.set(null);
    this.roleNombre.set('');
    this.roleDescripcion.set('');
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: RoleItem): void {
    if (!item.id) return;
    this.isEditing.set(true);
    this.selectedRoleId.set(item.id);
    this.roleNombre.set(item.nombre || item.role);
    this.roleDescripcion.set(item.descripcion || this.getRoleDescription(item.role));
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveRole(): void {
    if (!this.roleNombre().trim()) {
      this.errorMessage.set('El nombre del rol es obligatorio.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.selectedRoleId()) {
      this.roleService
        .updateRole(this.selectedRoleId()!, {
          nombre: this.roleNombre().trim(),
          descripcion: this.roleDescripcion().trim() || undefined,
        })
        .subscribe({
          next: () => {
            this.successMessage.set('Rol actualizado exitosamente.');
            this.closeModal();
            this.loadRoles();
            setTimeout(() => this.successMessage.set(null), 3000);
          },
          error: (err) => {
            this.errorMessage.set(err.error?.detail || 'Error al actualizar el rol.');
            this.isLoading.set(false);
          },
        });
    } else {
      this.roleService
        .createRole({
          nombre: this.roleNombre().trim(),
          descripcion: this.roleDescripcion().trim() || undefined,
        })
        .subscribe({
          next: () => {
            this.successMessage.set('Rol creado exitosamente.');
            this.closeModal();
            this.loadRoles();
            setTimeout(() => this.successMessage.set(null), 3000);
          },
          error: (err) => {
            this.errorMessage.set(err.error?.detail || 'Error al crear el rol.');
            this.isLoading.set(false);
          },
        });
    }
  }

  deleteRole(item: RoleItem): void {
    if (!item.id) return;
    if (!confirm(`¿Está seguro de eliminar el rol "${item.nombre || item.role}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this.roleService.deleteRole(item.id).subscribe({
      next: () => {
        this.successMessage.set('Rol eliminado exitosamente.');
        this.loadRoles();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se puede eliminar el rol.');
        this.isLoading.set(false);
      },
    });
  }

  getRoleDescription(role: string): string {
    switch (role) {
      case 'administrador':
        return 'Acceso total y sin restricciones a todos los módulos del sistema y auditoría.';
      case 'encargado_sucursal':
        return 'Gestión de productos, catálogo y operaciones de inventario.';
      case 'cajero':
        return 'Consulta de catálogo y atención de ventas en caja.';
      case 'cliente':
        return 'Usuario estándar para navegación, perfil y compras en la tienda.';
      default:
        return 'Rol personalizado del sistema.';
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'administrador':
        return '👑';
      case 'encargado_sucursal':
        return '🏢';
      case 'cajero':
        return '💳';
      case 'cliente':
        return '🛍️';
      default:
        return '🛡️';
    }
  }
}
