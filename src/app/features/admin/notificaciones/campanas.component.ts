import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import {
  CampanaNotificacion,
  DestinatariosCampana,
  NotificacionesService,
} from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-campanas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campanas.component.html',
  styleUrl: './campanas.component.css',
})
export class CampanasComponent implements OnInit {
  private readonly notifications = inject(NotificacionesService);
  private readonly auth = inject(AuthService);

  targets: DestinatariosCampana = { modo: 'tenant', empresas: [], usuarios: [] };
  campaigns: CampanaNotificacion[] = [];
  title = '';
  message = '';
  actionUrl = '';
  audience = 'todos';
  selectedUserIds: number[] = [];
  selectedCompanyIds: number[] = [];
  schedule = false;
  scheduledFor = '';
  recurring = false;
  recurrenceDays = 3;
  sendEmail = false;
  loading = false;
  feedback = '';
  error = '';

  get isPlatformAdmin(): boolean {
    return !!this.auth.currentUser()?.is_platform_admin;
  }

  ngOnInit(): void {
    this.audience = this.isPlatformAdmin ? 'admins_tenant' : 'todos';
    this.reload();
  }

  reload(): void {
    this.notifications.getDestinatariosCampana().subscribe({
      next: (result) => (this.targets = result),
      error: (error) => (this.error = error.error?.detail || 'No se pudieron cargar los destinatarios.'),
    });
    this.notifications.getCampanas().subscribe({
      next: (items) => (this.campaigns = items),
    });
  }

  toggleUser(id: number, checked: boolean): void {
    this.selectedUserIds = checked
      ? [...this.selectedUserIds, id]
      : this.selectedUserIds.filter((item) => item !== id);
  }

  toggleCompany(id: number, checked: boolean): void {
    this.selectedCompanyIds = checked
      ? [...this.selectedCompanyIds, id]
      : this.selectedCompanyIds.filter((item) => item !== id);
  }

  submit(): void {
    this.error = '';
    this.feedback = '';
    if (!this.title.trim() || !this.message.trim()) {
      this.error = 'Escribe un título y un mensaje.';
      return;
    }
    if (this.schedule && !this.scheduledFor) {
      this.error = 'Selecciona la fecha y hora de envío.';
      return;
    }
    if (this.audience === 'usuarios_seleccionados' && !this.selectedUserIds.length) {
      this.error = 'Selecciona al menos un usuario.';
      return;
    }
    this.loading = true;
    this.notifications.crearCampana({
      titulo: this.title.trim(),
      mensaje: this.message.trim(),
      url_accion: this.actionUrl.trim() || undefined,
      audiencia: this.isPlatformAdmin ? 'admins_tenant' : this.audience,
      target_user_ids: this.selectedUserIds,
      target_empresa_ids: this.selectedCompanyIds,
      programada_para: this.schedule ? new Date(this.scheduledFor).toISOString() : undefined,
      recurrencia_dias: this.recurring ? this.recurrenceDays : undefined,
      enviar_email: this.sendEmail,
    }).subscribe({
      next: (campaign) => {
        this.loading = false;
        this.feedback = campaign.estado === 'completada'
          ? `Notificación enviada a ${campaign.total_destinatarios} destinatario(s).`
          : 'Campaña programada correctamente.';
        this.title = '';
        this.message = '';
        this.actionUrl = '';
        this.campaigns = [campaign, ...this.campaigns];
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.detail || 'No se pudo guardar la campaña.';
      },
    });
  }

  cancel(campaign: CampanaNotificacion): void {
    if (!confirm(`¿Cancelar la campaña “${campaign.titulo}”?`)) return;
    this.notifications.cancelarCampana(campaign.id).subscribe({
      next: (updated) => {
        this.campaigns = this.campaigns.map((item) => item.id === updated.id ? updated : item);
      },
      error: (error) => (this.error = error.error?.detail || 'No se pudo cancelar.'),
    });
  }
}
