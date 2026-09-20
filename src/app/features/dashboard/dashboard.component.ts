import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  user = signal<User | null>(this.authService.currentUser());
  isLoading = signal<boolean>(!this.authService.currentUser());
  errorMessage = signal<string | null>(null);

  // Sucursales y Filtro
  sucursales: Sucursal[] = [];
  selectedSucursalId: number | null = null;

  // Estadísticas del Dashboard
  stats: any = null;
  loadingStats: boolean = false;

  ngOnInit(): void {
    if (this.user() && this.isStaff) {
      this.loadDashboardStats();
    }
    this.loadProfile();
    this.loadSucursales();
  }

  loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user.set(profile);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        if (this.isStaff) {
          this.loadDashboardStats();
        }
      },
      error: (err) => {
        if (!this.user()) {
          this.errorMessage.set(err.error?.detail || 'No se pudo cargar el perfil.');
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error cargando sucursales en dashboard:', err),
    });
  }

  loadDashboardStats(): void {
    if (!this.isStaff) return;
    this.loadingStats = true;
    this.cdr.markForCheck();

    this.reportesService.getDashboardStats(this.selectedSucursalId || undefined).subscribe({
      next: (data) => {
        this.stats = data;
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSucursalChange(): void {
    if (this.isStaff) {
      this.loadDashboardStats();
    }
  }

  get isAdmin(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin');
  }

  get isStaff(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('encargado') || role.includes('cajero') || role.includes('repartidor');
  }

  get isCliente(): boolean {
    const role = (this.user()?.role || '').toLowerCase();
    return role === 'cliente' || (!this.isStaff && !!this.user());
  }
}
