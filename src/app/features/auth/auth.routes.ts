import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { guestGuard } from '../../core/guards/guest.guard';
import { TenantSelectorComponent } from './tenant-selector/tenant-selector.component';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'tenant',
    pathMatch: 'full',
  },
  {
    path: 'tenant',
    component: TenantSelectorComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    redirectTo: 'tenant',
    pathMatch: 'full',
  },
];
