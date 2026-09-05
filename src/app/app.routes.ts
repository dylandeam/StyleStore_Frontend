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
      {
        path: 'admin/productos',
        component: ProductosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
      {
        path: 'admin/sucursales',
        component: SucursalesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
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
