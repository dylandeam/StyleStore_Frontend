import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UsuariosListComponent } from './features/admin/usuarios/usuarios-list/usuarios-list.component';
import { RolesListComponent } from './features/admin/roles/roles-list/roles-list.component';
import { RolPermisosComponent } from './features/admin/roles/rol-permisos/rol-permisos.component';
import { BitacoraListComponent } from './features/admin/bitacora/bitacora-list/bitacora-list.component';
import { SucursalesListComponent } from './features/admin/sucursales/sucursales-list/sucursales-list.component';
import { ProductosListComponent } from './features/admin/productos/productos-list/productos-list.component';
import { CategoriasListComponent } from './features/admin/categorias/categorias-list/categorias-list.component';
import { ColoresListComponent } from './features/admin/colores/colores-list/colores-list.component';
import { TallasListComponent } from './features/admin/tallas/tallas-list/tallas-list.component';
import { TemporadasListComponent } from './features/admin/temporadas/temporadas-list/temporadas-list.component';
import { EmpleadosListComponent } from './features/admin/empleados/empleados-list/empleados-list.component';
import { ClientesListComponent } from './features/admin/clientes/clientes-list/clientes-list.component';
import { ProveedoresListComponent } from './features/admin/proveedores/proveedores-list/proveedores-list.component';
import { ColeccionesComponent } from './features/admin/colecciones/colecciones.component';
import { ProximamenteComponent } from './features/admin/proximamente/proximamente.component';
import { InventarioComponent } from './features/admin/inventario/inventario.component';
import { ReservasComponent } from './features/admin/reservas/reservas.component';
import { VentasComponent } from './features/admin/ventas/ventas.component';
import { EnviosComponent } from './features/admin/envios/envios.component';
import { PerfilComponent } from './features/cuenta/perfil/perfil.component';
import { CambiarPasswordComponent } from './features/cuenta/cambiar-password/cambiar-password.component';
import { ConfirmarPasswordComponent } from './features/cuenta/confirmar-password/confirmar-password.component';
import { ProductoDetalleComponent } from './features/catalogo/producto-detalle/producto-detalle.component';
import { CarritoComponent } from './features/carrito/carrito.component';
import { PaypalReturnComponent } from './features/pagos/paypal-return/paypal-return.component';
import { CajaPosComponent } from './features/admin/caja/caja-pos.component';
import { BackupsComponent } from './features/admin/backups/backups.component';
import { ReportesComponent } from './features/admin/reportes/reportes.component';

import { CatalogoListComponent } from './features/catalogo/catalogo-list/catalogo-list.component';
import { MisComprasComponent } from './features/cuenta/mis-compras/mis-compras.component';
import { MisPagosComponent } from './features/cuenta/mis-pagos/mis-pagos.component';
import { CambiosListComponent } from './features/admin/cambios/cambios-list.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'cuenta/confirmar-password',
    component: ConfirmarPasswordComponent,
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      // Rutas para Clientes y Catálogo
      {
        path: 'catalogo',
        component: CatalogoListComponent,
      },
      {
        path: 'cuenta/mis-compras',
        component: MisComprasComponent,
        canActivate: [roleGuard(['cliente', 'administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'cuenta/mis-pagos',
        component: MisPagosComponent,
        canActivate: [roleGuard(['cliente', 'administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Catálogo y Colecciones para Administración y Staff
      {
        path: 'admin/productos',
        component: ProductosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/colecciones',
        component: ColeccionesComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/proximamente',
        component: ProximamenteComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/inventario',
        component: InventarioComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/categorias',
        component: CategoriasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin/colores',
        component: ColoresListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin/tallas',
        component: TallasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin/temporadas',
        component: TemporadasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      // Ventas, Reservas y Envíos para Staff
      {
        path: 'admin/ventas',
        component: VentasComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/reservas',
        component: ReservasComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/envios',
        component: EnviosComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Gestión de Cambios y Devoluciones (v6 Punto 9)
      {
        path: 'admin/cambios',
        component: CambiosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Administración y Personas
      {
        path: 'admin/sucursales',
        component: SucursalesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/empleados',
        component: EmpleadosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin/clientes',
        component: ClientesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'admin/proveedores',
        component: ProveedoresListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin/usuarios',
        component: UsuariosListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'admin/roles',
        component: RolesListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'admin/roles/:role/permisos',
        component: RolPermisosComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      // Auditoría
      {
        path: 'admin/bitacora',
        component: BitacoraListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Detalle de Producto con Recomendaciones IA
      {
        path: 'catalogo/producto/:codigo',
        component: ProductoDetalleComponent,
      },
      // Carrito de Compras & Checkout
      {
        path: 'carrito',
        component: CarritoComponent,
      },
      // Retorno tras pago en PayPal
      {
        path: 'paypal-return',
        component: PaypalReturnComponent,
      },
      // Caja y Cobros POS en Efectivo
      {
        path: 'admin/caja',
        component: CajaPosComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Copias de Seguridad Criptográficas SHA-256
      {
        path: 'admin/backups',
        component: BackupsComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      // Reportes Dinámicos Excel & PDF
      {
        path: 'admin/reportes',
        component: ReportesComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'admin',
        redirectTo: 'admin/productos',
        pathMatch: 'full',
      },
      {
        path: 'cuenta/perfil',
        component: PerfilComponent,
      },
      {
        path: 'cuenta/cambiar-password',
        component: CambiarPasswordComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
