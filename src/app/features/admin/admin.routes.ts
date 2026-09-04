import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { UsuariosListComponent } from './usuarios/usuarios-list/usuarios-list.component';
import { RolesListComponent } from './roles/roles-list/roles-list.component';
import { RolPermisosComponent } from './roles/rol-permisos/rol-permisos.component';
import { BitacoraListComponent } from './bitacora/bitacora-list/bitacora-list.component';
import { SucursalesListComponent } from './sucursales/sucursales-list/sucursales-list.component';
import { ProductosListComponent } from './productos/productos-list/productos-list.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'usuarios',
    component: UsuariosListComponent,
    canActivate: [authGuard, roleGuard(['administrador'])],
  },
  {
    path: 'roles',
    component: RolesListComponent,
    canActivate: [authGuard, roleGuard(['administrador'])],
  },
  {
    path: 'roles/:role/permisos',
    component: RolPermisosComponent,
    canActivate: [authGuard, roleGuard(['administrador'])],
  },
  {
    path: 'bitacora',
    component: BitacoraListComponent,
    canActivate: [authGuard, roleGuard(['administrador'])],
  },
  {
    path: 'sucursales',
    component: SucursalesListComponent,
    canActivate: [authGuard, roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
  },
  {
    path: 'productos',
    component: ProductosListComponent,
    canActivate: [authGuard, roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
  },
];
