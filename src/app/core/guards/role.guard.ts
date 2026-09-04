import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, of } from 'rxjs';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (user) {
      if (allowedRoles.includes(user.role) || user.role === 'administrador') {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }

    return authService.getProfile().pipe(
      map((fetchedUser) => {
        if (
          allowedRoles.includes(fetchedUser.role) ||
          fetchedUser.role === 'administrador'
        ) {
          return true;
        }
        router.navigate(['/dashboard']);
        return false;
      })
    );
  };
};
