import { Injectable } from '@angular/core';

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
  private reservas: Reserva[] = [
    { numero: 'R-0001', habitacion: 'Suite Vista Mar', titular: 'María García', fechaEntrada: '2026-02-14', fechaSalida: '2026-02-18', numeroHabitaciones: 1, adultos: 2, ninos: 0, precioTotal: 520.00, pension: 'Media Pensión', mascota: true, expanded: false, status: 'Pendiente' },
    { numero: 'R-0002', habitacion: 'Doble Superior', titular: 'Juan Pérez', fechaEntrada: '2026-03-01', fechaSalida: '2026-03-05', numeroHabitaciones: 2, adultos: 4, ninos: 1, precioTotal: 980.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0003', habitacion: 'Individual Económica', titular: 'Ana López', fechaEntrada: '2026-02-20', fechaSalida: '2026-02-21', numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 60.00, pension: 'Alojamiento y Desayuno', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0004', habitacion: 'Familiar Deluxe', titular: 'Carlos Martínez', fechaEntrada: '2026-04-10', fechaSalida: '2026-04-15', numeroHabitaciones: 2, adultos: 2, ninos: 2, precioTotal: 760.00, pension: 'Media Pensión', mascota: true, expanded: false, status: 'Confirmada' },
    { numero: 'R-0005', habitacion: 'Suite Nupcial', titular: 'Lucía Fernández', fechaEntrada: '2026-05-20', fechaSalida: '2026-05-25', numeroHabitaciones: 1, adultos: 2, ninos: 0, precioTotal: 1250.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' },
    { numero: 'R-0006', habitacion: 'Doble Económica', titular: 'Roberto Díaz', fechaEntrada: '2026-03-12', fechaSalida: '2026-03-13', numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 45.00, pension: 'Alojamiento', mascota: true, expanded: false, status: 'Denegada' },
    { numero: 'R-0007', habitacion: 'Apartamento', titular: 'Sofía Ruiz', fechaEntrada: '2026-06-01', fechaSalida: '2026-06-07', numeroHabitaciones: 1, adultos: 3, ninos: 1, precioTotal: 1340.00, pension: 'Media Pensión', mascota: false, expanded: false, status: 'Confirmada' },
    { numero: 'R-0008', habitacion: 'Suite Ejecutiva', titular: 'Empresa XYZ', fechaEntrada: '2026-07-10', fechaSalida: '2026-07-12', numeroHabitaciones: 2, adultos: 4, ninos: 0, precioTotal: 2100.00, pension: 'Pensión Completa', mascota: false, expanded: false, status: 'Pendiente' }
  ];

  constructor() {}

  getReservas(): Reserva[] {
    return this.reservas.slice();
  }

}
