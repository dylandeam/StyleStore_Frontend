import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RoleService } from '../../../../core/services/role.service';
import { RoleItem } from '../../../../core/models/role.model';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
})
export class RolesListComponent implements OnInit {
  private roleService = inject(RoleService);

  roles = signal<RoleItem[]>([]);
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.roleService.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.isLoading.set(false);
      },
      error: () => {
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
        return 'Rol del sistema.';
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
      default:
        return '👤';
    }
  }
}
