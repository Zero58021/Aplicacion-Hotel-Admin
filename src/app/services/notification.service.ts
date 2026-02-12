import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { AuthService } from './auth.service';

export interface AppNotification {
  role: string | null;
  roleLabel: string;
  area: string;
  message: string;
  timestamp: string; // ISO
}

const ROLE_LABELS: Record<string, string> = {
  recepcion: 'Recepción',
  limpieza: 'Limpieza',
  restaurante: 'Restaurante',
  mantenimiento: 'Mantenimiento',
  jefe: 'Jefe'
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications$ = new BehaviorSubject<AppNotification[]>([]);

  constructor(private toastCtrl: ToastController, private auth: AuthService) {}

  // Observable para suscribirse desde componentes
  getNotifications$(): Observable<AppNotification[]> {
    return this.notifications$.asObservable();
  }

  // Añade y muestra una notificación breve
  async notify(area: string, message: string, role?: string | null) {
    const resolvedRole = role ?? this.auth.getRole();
    // No notificar si el cambio lo hizo el rol 'jefe'
    if (resolvedRole === 'jefe') return;

    const roleLabel = resolvedRole ? (ROLE_LABELS[resolvedRole] ?? resolvedRole) : 'Sistema';
    const notif: AppNotification = {
      role: resolvedRole,
      roleLabel,
      area,
      message,
      timestamp: new Date().toISOString()
    };

    // push in-memory
    this.notifications$.next([notif, ...this.notifications$.getValue()]);

    // show toast
    const toast = await this.toastCtrl.create({
      message: `${roleLabel} ${message}`,
      duration: 3500,
      position: 'top'
    });
    await toast.present();
  }

  // Opcional: limpiar notificaciones
  clear() {
    this.notifications$.next([]);
  }
}
