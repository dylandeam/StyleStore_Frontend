import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const checkRole = (role?: string | null): boolean => {
      if (!role) return false;
      const normRole = role.toLowerCase().replace(/[\s_-]+/g, '');
      if (normRole.includes('admin')) return true;
      const normAllowed = allowedRoles.map((r) => r.toLowerCase().replace(/[\s_-]+/g, ''));
      return normAllowed.includes(normRole);
    };

    const user = authService.currentUser();
    if (user) {
      if (checkRole(user.role)) {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }

    return authService.getProfile().pipe(
      map((fetchedUser) => {
        if (checkRole(fetchedUser.role)) {
          return true;
        }
        router.navigate(['/dashboard']);
        return false;
      })
    );
  };
};

