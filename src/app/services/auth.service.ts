import { Injectable } from '@angular/core';

export type Role =
  | 'recepcion'
  | 'limpieza'
  | 'restaurante'
  | 'mantenimiento'
  | 'jefe';

export type Permission =
  | 'reservas.view'
  | 'reservas.edit'
  | 'reservas.confirm'
  | 'reservas.delete'
  | 'reservas.allergies'
  | 'calendario.view'
  | 'equipo.view'
  | 'habitaciones.view'
  | 'habitaciones.estado'
  | 'habitaciones.edit';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {

  recepcion: [
    'reservas.view',
    'reservas.edit',
    'calendario.view',
    'habitaciones.view'
  ],

  limpieza: [
    'calendario.view',
    'habitaciones.view',
    'habitaciones.estado'
  ],

  restaurante: [
    'reservas.view',
    'reservas.allergies',
    'calendario.view'
  ],

  mantenimiento: [
    'calendario.view',
    'habitaciones.view',
    'habitaciones.estado',
    // 'habitaciones.edit' removed: mantenimiento may only change estado
  ],

  jefe: [
    'reservas.view',
    'reservas.edit',
    'reservas.confirm',
    'reservas.delete',
    'reservas.allergies',
    'calendario.view',
    'equipo.view',
    'habitaciones.view',
    'habitaciones.estado',
    'habitaciones.edit'
  ]
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private role: Role | null = null;
  private readonly PASSWORD = '1234';

  constructor() {
    const savedRole = localStorage.getItem('role') as Role | null;
    if (savedRole) {
      this.role = savedRole;
    }
  }

  // 🔐 LOGIN
  login(role: Role, password: string): boolean {
    if (password === this.PASSWORD) {
      this.role = role;
      localStorage.setItem('role', role);
      return true;
    }
    return false;
  }

  // 🚪 LOGOUT
  logout(): void {
    this.role = null;
    localStorage.removeItem('role');
  }

  // 👤 Obtener rol actual
  getRole(): Role | null {
    return this.role;
  }

  // ✅ Saber si está logueado
  isLogged(): boolean {
    return this.role !== null;
  }

  // 🔎 Comprobar permiso
  hasPermission(permission: Permission): boolean {
    if (!this.role) return false;
    return ROLE_PERMISSIONS[this.role]?.includes(permission) ?? false;
  }
}
