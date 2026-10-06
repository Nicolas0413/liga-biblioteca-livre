import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const user = await inject(AuthService).usuario();
  return user ? true : inject(Router).createUrlTree(['/login']);
};
