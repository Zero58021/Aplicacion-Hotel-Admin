import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Reserva {
  numero: string;
  habitacion: string;
  titular: string;
  fechaEntrada: string; // ISO date
  fechaSalida: string;
  numeroHabitaciones?: number;
  adultos?: number;
  ninos?: number;
  precioTotal?: number;
  pension?: string;
  mascota?: boolean;
  expanded?: boolean;
  status?: 'Pendiente' | 'Confirmada' | 'Denegada';
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private initial: Reserva[] = [
    { numero: 'R-0001', habitacion: 'Suite Vista Mar', titular: 'María García', fechaEntrada: '2026-02-14', fechaSalida: '2026-02-18', numeroHabitaciones: 1, adultos: 2, ninos: 0, precioTotal: 520.00, pension: 'Media Pensión', mascota: true, expanded: false, status: 'Pendiente' },
    { numero: 'R-0002', habitacion: 'Doble Superior', titular: 'Juan Pérez', fechaEntrada: '2026-03-01', fechaSalida: '2026-03-05', numeroHabitaciones: 2, adultos: 4, ninos: 1, precioTotal: 980.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0003', habitacion: 'Individual Económica', titular: 'Ana López', fechaEntrada: '2026-02-20', fechaSalida: '2026-02-21', numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 60.00, pension: 'Alojamiento y Desayuno', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0004', habitacion: 'Familiar Deluxe', titular: 'Carlos Martínez', fechaEntrada: '2026-04-10', fechaSalida: '2026-04-15', numeroHabitaciones: 2, adultos: 2, ninos: 2, precioTotal: 760.00, pension: 'Media Pensión', mascota: true, expanded: false, status: 'Confirmada' },
    { numero: 'R-0005', habitacion: 'Suite Nupcial', titular: 'Lucía Fernández', fechaEntrada: '2026-05-20', fechaSalida: '2026-05-25', numeroHabitaciones: 1, adultos: 2, ninos: 0, precioTotal: 1250.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0006', habitacion: 'Doble Económica', titular: 'Roberto Díaz', fechaEntrada: '2026-03-12', fechaSalida: '2026-03-13', numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 45.00, pension: 'Alojamiento', mascota: true, expanded: false, status: 'Denegada' },
    { numero: 'R-0007', habitacion: 'Apartamento', titular: 'Sofía Ruiz', fechaEntrada: '2026-06-01', fechaSalida: '2026-06-07', numeroHabitaciones: 1, adultos: 3, ninos: 1, precioTotal: 1340.00, pension: 'Media Pensión', mascota: false, expanded: false, status: 'Confirmada' },
    { numero: 'R-0008', habitacion: 'Suite Ejecutiva', titular: 'Empresa XYZ', fechaEntrada: '2026-07-10', fechaSalida: '2026-07-12', numeroHabitaciones: 2, adultos: 4, ninos: 0, precioTotal: 2100.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' }
  ];

  private reservas$ = new BehaviorSubject<Reserva[]>(this.initial.slice());

  constructor() {}

  // Observable para que componentes puedan suscribirse y reaccionar a cambios
  getReservas$(): Observable<Reserva[]> {
    return this.reservas$.asObservable();
  }

  // Compatibilidad: obtener copia sin subscribirse
  getReservas(): Reserva[] {
    return this.reservas$.getValue().slice();
  }

  addReserva(res: Partial<Reserva>) {
    const current = this.reservas$.getValue();
    // generar número si no viene
    const nums = current.map(x => parseInt((x.numero?.match(/\d+/) || ['0'])[0], 10)).filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    const next = (max + 1).toString().padStart(4, '0');
    const nueva: Reserva = { ...res, numero: `R-${next}`, expanded: false } as Reserva;
    this.reservas$.next([nueva, ...current]);
    return nueva;
  }

  updateReserva(numero: string, partial: Partial<Reserva>) {
    const current = this.reservas$.getValue();
    const idx = current.findIndex(r => r.numero === numero);
    if (idx < 0) return false;
    const updated: Reserva = { ...current[idx], ...partial, numero } as Reserva;
    const copy = [...current];
    copy[idx] = updated;
    this.reservas$.next(copy);
    return true;
  }

  deleteReserva(numero: string) {
    const current = this.reservas$.getValue();
    const copy = current.filter(r => r.numero !== numero);
    this.reservas$.next(copy);
  }

}
