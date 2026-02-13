import { Injectable } from '@angular/core';
import { ApiService } from './api'; // Asegúrate de que la ruta es correcta
import { firstValueFrom } from 'rxjs';

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

  constructor(private api: ApiService) {
    // Al arrancar, recuperamos el rol si estaba guardado
    const savedRole = localStorage.getItem('role') as Role | null;
    if (savedRole) {
      this.role = savedRole;
    }
  }

  /**
   * 🔐 LOGIN REAL CONTRA EL SERVIDOR
   * Ahora es asíncrono porque tiene que esperar la respuesta del PC
   */
  async login(role: Role, password: string): Promise<boolean> {
    try {
      // 1. Obtenemos la lista de empleados del db.json
      const empleados = await firstValueFrom(this.api.getEmpleados());
      
      // 2. Buscamos el empleado que coincida con el rol y la contraseña
      // Usamos toLowerCase() en el rol para evitar fallos de mayúsculas
      const userFound = empleados.find(emp => 
        emp.rol.toLowerCase() === role.toLowerCase() && 
        emp.password === password
      );

      if (userFound) {
        // 3. Si existe, guardamos su rol y nombre
        this.role = role;
        localStorage.setItem('role', role);
        localStorage.setItem('userName', userFound.nombre);
        return true;
      }
      
      return false; // Contraseña o rol incorrecto
    } catch (error) {
      console.error('Error conectando con el servidor en el login:', error);
      return false;
    }
  }

  // 🚪 LOGOUT
  logout(): void {
    this.role = null;
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
  }

  // 👤 Obtener rol actual
  getRole(): Role | null {
    return this.role;
  }

  // ✅ Saber si está logueado
  isLogged(): boolean {
    return this.role !== null;
  }

  // 🔎 Comprobar permiso (Usado en el HTML con *ngIf)
  hasPermission(permission: Permission): boolean {
    if (!this.role) return false;
    return ROLE_PERMISSIONS[this.role]?.includes(permission) ?? false;
  }
}