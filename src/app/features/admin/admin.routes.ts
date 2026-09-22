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
import { CategoriasListComponent } from './categorias/categorias-list/categorias-list.component';
import { ColoresListComponent } from './colores/colores-list/colores-list.component';
import { TallasListComponent } from './tallas/tallas-list/tallas-list.component';
import { TemporadasListComponent } from './temporadas/temporadas-list/temporadas-list.component';
import { EmpleadosListComponent } from './empleados/empleados-list/empleados-list.component';
import { ClientesListComponent } from './clientes/clientes-list/clientes-list.component';
import { ProveedoresListComponent } from './proveedores/proveedores-list/proveedores-list.component';
import { ColeccionesComponent } from './colecciones/colecciones.component';
import { ProximamenteComponent } from './proximamente/proximamente.component';
import { InventarioComponent } from './inventario/inventario.component';
import { ReservasComponent } from './reservas/reservas.component';
import { VentasComponent } from './ventas/ventas.component';
import { EnviosComponent } from './envios/envios.component';

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
      // Catálogo y Colecciones
      {
        path: 'productos',
        component: ProductosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
      {
        path: 'productos/:codigo/calibrar',
        loadComponent: () => import('./productos/calibrar-prenda/calibrar-prenda.component').then(m => m.CalibrarPrendaComponent),
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'colecciones',
        component: ColeccionesComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'proximamente',
        component: ProximamenteComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
      {
        path: 'inventario',
        component: InventarioComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'categorias',
        component: CategoriasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'colores',
        component: ColoresListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'tallas',
        component: TallasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'temporadas',
        component: TemporadasListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      // Ventas, Reservas y Envíos
      {
        path: 'ventas',
        component: VentasComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'reservas',
        component: ReservasComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'envios',
        component: EnviosComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      // Administración y Personas
      {
        path: 'sucursales',
        component: SucursalesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero', 'cliente'])],
      },
      {
        path: 'empleados',
        component: EmpleadosListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
      },
      {
        path: 'clientes',
        component: ClientesListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal', 'cajero'])],
      },
      {
        path: 'proveedores',
        component: ProveedoresListComponent,
        canActivate: [roleGuard(['administrador', 'encargado_sucursal'])],
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
      // Auditoría
      {
        path: 'bitacora',
        component: BitacoraListComponent,
        canActivate: [roleGuard(['administrador'])],
      },
    ],
  },
];
