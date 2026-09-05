import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isSucursalesSubmenuOpen = signal<boolean>(true);
  readonly isRolesSubmenuOpen = signal<boolean>(true);

  readonly user = this.authService.currentUser;

  ngOnInit(): void {
    if (!this.user()) {
      this.authService.getProfile().subscribe({
        error: () => {
          this.authService.logout();
        },
      });
    }
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'administrador';
  }

  get isStaff(): boolean {
    const role = this.user()?.role;
    return role === 'administrador' || role === 'encargado_sucursal' || role === 'cajero';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  toggleSucursalesSubmenu(): void {
    this.isSucursalesSubmenuOpen.update((val) => !val);
  }

  toggleRolesSubmenu(): void {
    this.isRolesSubmenuOpen.update((val) => !val);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
