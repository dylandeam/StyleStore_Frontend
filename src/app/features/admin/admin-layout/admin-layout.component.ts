import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService, NotificacionItem, MisNotificacionesResponse } from '../../../core/services/notificaciones.service';
import { ChatbotWidgetComponent } from '../../chatbot/chatbot-widget/chatbot-widget.component';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatbotWidgetComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacionesService = inject(NotificacionesService);

  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly user = this.authService.currentUser;

  // Notificaciones In-App
  readonly notificaciones = signal<any[]>([]);
  readonly showNotificacionesDropdown = signal<boolean>(false);
  readonly unreadNotificationsCount = computed(() =>
    this.notificaciones().filter((n) => !n.leida).length
  );

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
        this.isMobileMenuOpen.set(false);
      });

    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.notificacionesService.getMisNotificaciones().subscribe({
      next: (res: MisNotificacionesResponse) => this.notificaciones.set(res?.items || []),
      error: () => {},
    });
  }

  toggleNotificacionesDropdown(): void {
    this.showNotificacionesDropdown.update((val) => !val);
  }

  marcarNotificacionLeida(notif: any): void {
    if (notif.leida) return;
    this.notificacionesService.marcarLeida(notif.id).subscribe({
      next: () => {
        notif.leida = true;
        this.notificaciones.update((list) => [...list]);
      },
    });
  }

  private updateHeaderMeta(url: string): void {
    if (url.includes('/catalogo') && !url.includes('/admin')) {
      this.currentTitle.set('Catálogo de Prendas');
      this.currentSubtitle.set('Explora colecciones exclusivas, filtra por sucursal y reserva tus prendas');
    } else if (url.includes('/cuenta/mis-compras')) {
      this.currentTitle.set('Mis Compras');
      this.currentSubtitle.set('Historial de pedidos, tickets POS y solicitud de cambios en 7 días');
    } else if (url.includes('/cuenta/mis-pagos')) {
      this.currentTitle.set('Historial de Pagos');
      this.currentSubtitle.set('Comprobantes de pago, transacciones PayPal y notas de venta');
    } else if (url.includes('/cuenta/mis-reservas')) {
      this.currentTitle.set('Mis Reservas');
      this.currentSubtitle.set('Consulta tus prendas apartadas, fechas de retiro, tickets y cancelaciones');
    } else if (url.includes('/admin/cambios')) {
      this.currentTitle.set('Cambios y Devoluciones');
      this.currentSubtitle.set('Revisión de solicitudes (plazo 7 días) y canje en caja POS con stock');
    } else if (url.includes('/admin/caja')) {
      this.currentTitle.set('Caja y Punto de Venta POS');
      this.currentSubtitle.set('Cobro de órdenes pendientes y venta directa en mostrador');
    } else if (url.includes('/admin/reportes')) {
      this.currentTitle.set('Suite de Reportes Especializados');
      this.currentSubtitle.set('Generación de 8 reportes dinámicos, exportación Excel y PDF');
    } else if (url.includes('/admin/productos')) {
      this.currentTitle.set('Catálogo de Productos');
      this.currentSubtitle.set('Prendas, calzados, stock e inventario por sucursal (CU10)');
    } else if (url.includes('/admin/colecciones')) {
      this.currentTitle.set('Colecciones');
      this.currentSubtitle.set('Lanzamientos temáticos y líneas de temporada (CU15)');
    } else if (url.includes('/admin/proximamente')) {
      this.currentTitle.set('Próximamente');
      this.currentSubtitle.set('Prendas exclusivas de próximo lanzamiento');
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
    } else if (url.includes('/admin/inventario')) {
      this.currentTitle.set('Control de Inventario');
      this.currentSubtitle.set('Stock global y existencias por sucursal');
    } else if (url.includes('/admin/reservas')) {
      this.currentTitle.set('Gestión de Reservas');
      this.currentSubtitle.set('Control de reservas, entregas y tickets');
    } else if (url.includes('/admin/ventas')) {
      this.currentTitle.set('Gestión de Ventas');
      this.currentSubtitle.set('Reporte consolidado de ventas presenciales y online');
    } else if (url.includes('/admin/envios')) {
      this.currentTitle.set('Despachos y Envíos');
      this.currentSubtitle.set('Control de entregas a domicilio y tarifas');
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
      this.currentSubtitle.set('Matriz de seguridad y permisos dinámicos (CU5)');
    } else if (url.includes('/admin/bitacora')) {
      this.currentTitle.set('Bitácora de Auditoría');
      this.currentSubtitle.set('Historial inmutable de eventos del sistema (CU6)');
    } else if (url.includes('/cuenta/perfil')) {
      this.currentTitle.set('Información Personal');
      this.currentSubtitle.set('Perfil de usuario y datos de contacto (CU2)');
    } else if (url.includes('/cuenta/cambiar-password')) {
      this.currentTitle.set('Seguridad de Cuenta');
      this.currentSubtitle.set('Cambio de contraseña con confirmación por correo (CU4)');
    } else if (url.includes('/catalogo/producto')) {
      this.currentTitle.set('Detalle de Prenda');
      this.currentSubtitle.set('Ficha técnica, variantes de color y recomendaciones de IA');
    } else if (url.includes('/carrito')) {
      this.currentTitle.set('Bolsa de Compras');
      this.currentSubtitle.set('Resumen de pedido, despacho con Yango y pasarela de pago');
    } else {
      this.currentTitle.set('Dashboard');
      this.currentSubtitle.set('Resumen general y módulos del sistema');
    }
  }

  get isAdmin(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin');
  }

  get isStaff(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('encargado') || role.includes('cajero');
  }

  get isCliente(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role === 'cliente' || (!this.isStaff && !!this.user());
  }

  get canManageStore(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('encargado');
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((val) => !val);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
