import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allow = (isPlatformAdmin?: boolean): boolean => {
    if (isPlatformAdmin) return true;
    router.navigate(['/dashboard']);
    return false;
  };
  const user = auth.currentUser();
  return user ? allow(user.is_platform_admin) : auth.getProfile().pipe(map((profile) => allow(profile.is_platform_admin)));
};
