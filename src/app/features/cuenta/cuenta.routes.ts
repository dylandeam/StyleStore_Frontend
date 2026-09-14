import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { CambiarPasswordComponent } from './cambiar-password/cambiar-password.component';
import { ConfirmarPasswordComponent } from './confirmar-password/confirmar-password.component';
import { PerfilComponent } from './perfil/perfil.component';

export const CUENTA_ROUTES: Routes = [
  {
    path: 'perfil',
    component: PerfilComponent,
    canActivate: [authGuard],
  },
  {
    path: 'cambiar-password',
    component: CambiarPasswordComponent,
    canActivate: [authGuard],
  },
  {
    path: 'confirmar-password',
    component: ConfirmarPasswordComponent,
  },
];
