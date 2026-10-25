import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const checkRole = (role?: string | null, isPlatformAdmin = false): boolean => {
      if (!role) return false;
      if (isPlatformAdmin) return true;
      const normRole = role.toLowerCase().replace(/[\s_-]+/g, '');
      const normAllowed = allowedRoles.map((r) => r.toLowerCase().replace(/[\s_-]+/g, ''));
      return normAllowed.includes(normRole);
    };

    const user = authService.currentUser();
    if (user) {
      if (checkRole(user.role, !!user.is_platform_admin)) {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }

    return authService.getProfile().pipe(
      map((fetchedUser) => {
        if (checkRole(fetchedUser.role, !!fetchedUser.is_platform_admin)) {
          return true;
        }
        router.navigate(['/dashboard']);
        return false;
      })
    );
  };
};

