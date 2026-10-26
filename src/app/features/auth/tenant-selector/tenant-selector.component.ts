import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RegistrationCompany } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tenant-selector.component.html',
  styleUrl: './tenant-selector.component.css',
})
export class TenantSelectorComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  private readonly branding = inject(BrandingService);
  private readonly uploads = inject(UploadService);

  readonly companies = signal<RegistrationCompany[]>([]);
  readonly search = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filteredCompanies = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term
      ? this.companies().filter((item) => `${item.nombre} ${item.codigo}`.toLowerCase().includes(term))
      : this.companies();
  });

  ngOnInit(): void {
    this.branding.reset();
    this.authService.getRegistrationCompanies().subscribe({
      next: (items) => {
        this.companies.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las empresas. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  openTenant(company: RegistrationCompany): void {
    this.router.navigate(['/t', company.codigo, 'login'], {
      queryParams: { returnUrl: this.route.snapshot.queryParamMap.get('returnUrl') || undefined },
    });
  }

  companyLogo(company: RegistrationCompany): string {
    return this.uploads.getImageUrl(company.logo_url, 'logos');
  }
}
