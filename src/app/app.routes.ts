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
import { CambiarPasswordComponent } from './features/cuenta/cambiar-password/cambiar-password.component';
import { ConfirmarPasswordComponent } from './features/cuenta/confirmar-password/confirmar-password.component';

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
      // Catálogo
      {
        path: 'admin/productos',
        component: ProductosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
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
      // Administración y Personas
      {
        path: 'admin/sucursales',
        component: SucursalesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
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
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'admin',
        redirectTo: 'admin/productos',
        pathMatch: 'full',
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
