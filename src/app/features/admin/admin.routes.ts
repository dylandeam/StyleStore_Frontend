import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { UsuariosListComponent } from './usuarios/usuarios-list/usuarios-list.component';
import { RolesListComponent } from './roles/roles-list/roles-list.component';
import { RolPermisosComponent } from './roles/rol-permisos/rol-permisos.component';
import { BitacoraListComponent } from './bitacora/bitacora-list/bitacora-list.component';
import { SucursalesListComponent } from './sucursales/sucursales-list/sucursales-list.component';
import { ProductosListComponent } from './productos/productos-list/productos-list.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'productos',
        pathMatch: 'full',
      },
      {
        path: 'usuarios',
        component: UsuariosListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'roles',
        component: RolesListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'roles/:role/permisos',
        component: RolPermisosComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'bitacora',
        component: BitacoraListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
      {
        path: 'sucursales',
        component: SucursalesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
      {
        path: 'productos',
        component: ProductosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
    ],
  },
];
