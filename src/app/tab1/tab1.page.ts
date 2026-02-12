import { Component, OnInit } from '@angular/core';
import { StateService } from '../services/state.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService, Permission } from '../services/auth.service';

interface ActionButton {
  label: string;
  icon: string;
  permission?: Permission; // Permiso requerido, opcional (logout no necesita)
  path?: string;           // Ruta para navegar
  onClick?: () => void;    // Acción alternativa
  shift?: number;          // Desplazamiento vertical en px para alineación
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  showText = false;
  buttons: ActionButton[] = [];
  roleLabel = '';

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private state: StateService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.setupButtons();

    const role = this.auth.getRole();
    this.roleLabel = role ? role.toUpperCase() : 'INVITADO';

    const saved = this.state.getState() || {};
    if (saved.tab1 && typeof saved.tab1.showText === 'boolean') {
      this.showText = saved.tab1.showText;
    }
    this.state.state$.subscribe(s => {
      if (s && s.tab1 && typeof s.tab1.showText === 'boolean') {
        this.showText = s.tab1.showText;
      }
    });
  }

  setupButtons() {
    const allButtons: ActionButton[] = [
      { label: 'Reservas', icon: 'book', permission: 'reservas.view', path: '/tabs/tab2', shift: 0 },
      { label: 'Calendario', icon: 'calendar', permission: 'calendario.view', path: '/tabs/tab3', shift: 10 },
      { label: 'Habitaciones', icon: 'bed', permission: 'habitaciones.view', path: '/tabs/tab4', shift: 10 },
      { label: 'Equipo', icon: 'people', permission: 'equipo.view', path: '/tabs/tab5', shift: 0 },
      { label: 'Logout', icon: 'log-out', onClick: () => this.logout(), shift: 0 } // siempre visible
    ];

    const role = this.auth.getRole();

    // Para el rol 'restaurante' solo mostramos Reservas + Logout y los alineamos a la misma altura
    if (role === 'restaurante') {
      const reservaBtn = allButtons.find(b => b.label === 'Reservas');
      const calendarioBtn = allButtons.find(b => b.label === 'Calendario');
      const logoutBtn = allButtons.find(b => b.label === 'Logout');
      this.buttons = [];
      if (reservaBtn) this.buttons.push(reservaBtn);
      if (calendarioBtn) this.buttons.push(calendarioBtn);
      if (logoutBtn) this.buttons.push(logoutBtn);
      return;
    }

    // Filtramos los botones según permisos para los demás roles
    this.buttons = allButtons.filter(btn => {
      if (!btn.permission) return true;
      return this.auth.hasPermission(btn.permission);
    });
  }

  navigate(path: string) {
    this.navCtrl.navigateRoot(path).catch(() => this.router.navigateByUrl(path));
  }

  selectTab(ev: Event, path: string) {
    ev.preventDefault();
    ev.stopPropagation();
    this.navCtrl.navigateRoot(path);
  }

  logout() {
    this.auth.logout();
    this.navCtrl.navigateRoot('/login');
  }
}
