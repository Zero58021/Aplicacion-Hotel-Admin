import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    // If user is not logged, redirect silently to login
    if (!this.auth.isLogged()) {
      return this.router.parseUrl('/login');
    }

    const permissions = route.data['permissions'] as Array<string>;
    const has = permissions.some(
      (p: string) => this.auth.hasPermission(p as any)
    );

    if (!has) {
      // User is logged but lacks permission: redirect to login silently
      // Clear session to avoid landing in a protected route repeatedly
      try {
        this.auth.logout();
      } catch (e) {
        // ignore logout errors
      }
      return this.router.parseUrl('/login');
    }

    return true;
  }
}
