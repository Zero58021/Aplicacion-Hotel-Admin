import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService, Permission, Role } from '../services/auth.service';

interface ActionButton {
  label: string;
  icon: string;
  permission?: Permission; 
  path?: string;           
  onClick?: () => void;    
  shift?: number;          
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

  constructor(
    private router: Router,
    private navCtrl: NavController,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.updateUserInterface();
  }

  // Se ejecuta cada vez que entramos a la pestaña
  ionViewWillEnter() {
    this.updateUserInterface();
  }

  updateUserInterface() {
    const role = this.auth.getRole();
    this.roleLabel = role ? role.toUpperCase() : 'INVITADO';
    
    // Recuperamos el nombre que guardamos en el login
    this.userName = localStorage.getItem('userName') || '';
    
    this.setupButtons(role);
  }

  setupButtons(role: Role | null) {
    // Definición maestra de todos los botones posibles
    const allButtons: ActionButton[] = [
      { label: 'Reservas', icon: 'book', permission: 'reservas.view', path: '/tabs/tab2' },
      { label: 'Calendario', icon: 'calendar', permission: 'calendario.view', path: '/tabs/tab3' },
      { label: 'Habitaciones', icon: 'bed', permission: 'habitaciones.view', path: '/tabs/tab4' },
      { label: 'Equipo y Gestión', icon: 'people', permission: 'equipo.view', path: '/tabs/tab5' },
      { label: 'Logout', icon: 'log-out', onClick: () => this.logout() }
    ];

    // Filtramos según el sistema de permisos del AuthService
    let filtered = allButtons.filter(btn => {
      if (!btn.permission) return true; // El botón Logout siempre se ve
      return this.auth.hasPermission(btn.permission);
    });

    // Aplicamos el "Efecto Curva U" dinámicamente según cuántos botones hay
    this.buttons = filtered.map((btn, index) => {
      let shift = 0;
      const total = filtered.length;
      
      // Si hay 4 o más botones, bajamos los centrales
      if (total >= 4) {
        if (index === 1 || index === 2) shift = 10;
      } 
      // Si hay 3 botones (como en Restaurante), bajamos el del medio
      else if (total === 3) {
        if (index === 1) shift = 10;
      }

      return { ...btn, shift };
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