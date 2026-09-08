import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly user = this.authService.currentUser;

  // Title of current section
  readonly currentTitle = signal<string>('Panel Principal');
  readonly currentSubtitle = signal<string>('Gestión centralizada de StyleStore');

  ngOnInit(): void {
    if (!this.user()) {
      this.authService.getProfile().subscribe({
        error: () => {
          this.authService.logout();
        },
      });
    }

    this.updateHeaderMeta(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateHeaderMeta(event.urlAfterRedirects || event.url);
      });
  }

  private updateHeaderMeta(url: string): void {
    if (url.includes('/admin/productos')) {
      this.currentTitle.set('Catálogo de Productos');
      this.currentSubtitle.set('Prendas, calzados, stock e inventario por sucursal (CU10)');
    } else if (url.includes('/admin/categorias')) {
      this.currentTitle.set('Categorías');
      this.currentSubtitle.set('Clasificación oficial de productos y prendas (CU11)');
    } else if (url.includes('/admin/colores')) {
      this.currentTitle.set('Colores');
      this.currentSubtitle.set('Paleta de colores para variantes de productos (CU12)');
    } else if (url.includes('/admin/tallas')) {
      this.currentTitle.set('Tallas');
      this.currentSubtitle.set('Dimensiones y numeraciones oficiales (CU13)');
    } else if (url.includes('/admin/temporadas')) {
      this.currentTitle.set('Temporadas');
      this.currentSubtitle.set('Estaciones y lanzamientos de colección de moda (CU14)');
    } else if (url.includes('/admin/sucursales')) {
      this.currentTitle.set('Sucursales');
      this.currentSubtitle.set('Puntos de venta físicos y atención al cliente');
    } else if (url.includes('/admin/empleados')) {
      this.currentTitle.set('Empleados');
      this.currentSubtitle.set('Personal con asignación de sucursal y credenciales (CU7)');
    } else if (url.includes('/admin/clientes')) {
      this.currentTitle.set('Clientes');
      this.currentSubtitle.set('Directorio de clientes para compras y reservas (CU8)');
    } else if (url.includes('/admin/proveedores')) {
      this.currentTitle.set('Proveedores');
      this.currentSubtitle.set('Directorio de fabricantes y abastecedores (CU9)');
    } else if (url.includes('/admin/usuarios')) {
      this.currentTitle.set('Usuarios del Sistema');
      this.currentSubtitle.set('Gestión de cuentas y accesos generales (CU1)');
    } else if (url.includes('/admin/roles')) {
      this.currentTitle.set('Roles y Permisos');
      this.currentSubtitle.set('Matriz de seguridad y permisos del sistema (CU5)');
    } else if (url.includes('/admin/bitacora')) {
      this.currentTitle.set('Bitácora de Auditoría');
      this.currentSubtitle.set('Historial inmutable de eventos del sistema (CU6)');
    } else if (url.includes('/cuenta/cambiar-password')) {
      this.currentTitle.set('Seguridad de Cuenta');
      this.currentSubtitle.set('Cambio de contraseña con confirmación por correo (CU4)');
    } else {
      this.currentTitle.set('Dashboard');
      this.currentSubtitle.set('Resumen general y módulos del sistema');
    }
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'administrador';
  }

  get canManageStore(): boolean {
    const role = this.user()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
