import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService, Permission, Role } from '../services/auth.service';

interface ActionButton {
  label: string;
  icon: string;
  description: string;       // NUEVO
  colorClass: string;        // NUEVO
  permission?: Permission; 
  path?: string;           
  onClick?: () => void;    
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  buttons: ActionButton[] = [];
  userName: string = '';
  roleLabel: string = '';
  currentDate: string = ''; // NUEVO

  constructor(
    private router: Router,
    private navCtrl: NavController,
    public auth: AuthService
  ) {
    this.setCurrentDate();
  }

  ngOnInit() {
    this.updateUserInterface();
  }

  ionViewWillEnter() {
    this.updateUserInterface();
    this.setCurrentDate(); // Actualiza la fecha si dejas la app en segundo plano
  }

  setCurrentDate() {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    this.currentDate = new Date().toLocaleDateString('es-ES', options);
  }

  updateUserInterface() {
    const role = this.auth.getRole();
    this.roleLabel = role ? role.toUpperCase() : 'INVITADO';
    this.userName = localStorage.getItem('userName') || '';
    
    this.setupButtons(role);
  }

  setupButtons(role: Role | null) {
    // Definición de botones con diseño de tarjeta
    const allButtons: ActionButton[] = [
      { 
        label: 'Reservas', 
        description: 'Gestiona llegadas y clientes',
        icon: 'book', 
        colorClass: 'card-blue',
        permission: 'reservas.view', 
        path: '/tabs/tab2' 
      },
      { 
        label: 'Calendario', 
        description: 'Visualiza la ocupación del mes',
        icon: 'calendar', 
        colorClass: 'card-purple',
        permission: 'calendario.view', 
        path: '/tabs/tab3' 
      },
      { 
        label: 'Habitaciones', 
        description: 'Control de estados y limpieza',
        icon: 'bed', 
        colorClass: 'card-orange',
        permission: 'habitaciones.view', 
        path: '/tabs/tab4' 
      },
      { 
        label: 'Equipo y Gestión', 
        description: 'Nóminas, roles y personal',
        icon: 'people', 
        colorClass: 'card-green',
        permission: 'equipo.view', 
        path: '/tabs/tab5' 
      },
      { 
        label: 'Logout', 
        description: 'Cerrar el turno actual',
        icon: 'log-out-outline', 
        colorClass: 'card-gray',
        onClick: () => this.logout() 
      }
    ];

    // Filtramos según el sistema de permisos
    this.buttons = allButtons.filter(btn => {
      if (!btn.permission) return true;
      return this.auth.hasPermission(btn.permission);
    });
  }

  navigate(path: string) {
    this.navCtrl.navigateRoot(path);
  }

  logout() {
    this.auth.logout();
    this.navCtrl.navigateRoot('/login');
  }
}