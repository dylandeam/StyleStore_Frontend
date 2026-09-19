import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { ReportesService } from '../../core/services/reportes.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { User } from '../../core/models/user.model';
import { Sucursal } from '../../core/models/sucursal.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private reportesService = inject(ReportesService);
  private sucursalService = inject(SucursalService);

  user = signal<User | null>(null);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Sucursales y Filtro
  sucursales: Sucursal[] = [];
  selectedSucursalId: number | null = null;

  // Estadísticas del Dashboard
  stats: any = null;
  loadingStats: boolean = false;

  ngOnInit(): void {
    this.loadProfile();
    this.loadSucursales();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user.set(profile);
        this.isLoading.set(false);
        this.loadDashboardStats();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo cargar el perfil.');
        this.isLoading.set(false);
      },
    });
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => (this.sucursales = data || []),
      error: (err) => console.error('Error cargando sucursales en dashboard:', err),
    });
  }

  loadDashboardStats(): void {
    this.loadingStats = true;
    this.reportesService.getDashboardStats(this.selectedSucursalId || undefined).subscribe({
      next: (data) => {
        this.stats = data;
        this.loadingStats = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
        this.loadingStats = false;
      },
    });
  }

  onSucursalChange(): void {
    this.loadDashboardStats();
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'administrador';
  }

  get isStaff(): boolean {
    const role = this.user()?.role;
    return role === 'administrador' || role === 'encargado_sucursal' || role === 'cajero';
  }

  get isCliente(): boolean {
    return this.user()?.role === 'cliente';
  }

  onLogout(): void {
    this.authService.logout();
  }
}
