import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PasswordService } from '../../../core/services/password.service';

@Component({
  selector: 'app-confirmar-password',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmar-password.component.html',
  styleUrls: ['./confirmar-password.component.css'],
})
export class ConfirmarPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private passwordService = inject(PasswordService);

  token = signal<string>('');
  isLoading = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  message = signal<string>('');

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    if (tokenParam) {
      this.token.set(tokenParam);
      this.confirmToken(tokenParam);
    } else {
      this.message.set('No se proporcionó ningún token de confirmación en el enlace.');
    }
  }

  confirmToken(tokenToConfirm: string): void {
    this.isLoading.set(true);
    this.message.set('');

    this.passwordService.confirmChange(tokenToConfirm).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.message.set(res.message);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isSuccess.set(false);
        const detail =
          err.error?.detail ||
          'El enlace de confirmación no es válido o ha expirado (límite de 15 minutos).';
        this.message.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
      },
    });
  }
}
