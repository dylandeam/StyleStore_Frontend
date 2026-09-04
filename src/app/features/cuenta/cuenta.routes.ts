import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { CambiarPasswordComponent } from './cambiar-password/cambiar-password.component';
import { ConfirmarPasswordComponent } from './confirmar-password/confirmar-password.component';

export const CUENTA_ROUTES: Routes = [
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
