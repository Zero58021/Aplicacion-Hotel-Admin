import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReservaService } from '../services/reserva.service';
import { AuthService } from '../services/auth.service';
import type { Reserva } from '../services/reserva.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  current = new Date();
  displayDate = new Date(this.current.getFullYear(), this.current.getMonth(), 1);
  monthName = '';
  year = 0;
  weeks: (number | null)[][] = [];
  weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  selected: Date | null = null;
  // 'entrada' = check-in, 'salida' = check-out, 'ambas' = ambos en misma fecha, 'pendiente' = reserva pendiente
  events: Record<string, 'entrada' | 'salida' | 'ambas' | 'pendiente'> = {};
  reservas: Reserva[] = [];
  private sub?: Subscription;

  constructor(private reservaService: ReservaService, public auth: AuthService) {}

  ngOnInit(): void {
    this.updateCalendar();
    // Suscribirse a cambios en las reservas para actualizar calendario y lista automáticamente
    this.sub = this.reservaService.getReservas$().subscribe(list => {
      this.reservas = list.map(r => ({ ...r }));
      this.loadEventsFromReservas();
      // si se muestra mes, quizá forzar recálculo (no cambiar displayDate aquí)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateCalendar() {
    this.monthName = this.displayDate.toLocaleString('es-ES', { month: 'long' });
    this.year = this.displayDate.getFullYear();
    this.generateWeeks();
  }

  private generateWeeks() {
    const year = this.displayDate.getFullYear();
    const month = this.displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let day = 1;
    for (let w = 0; w < 6; w++) {
      const week: (number | null)[] = [];
      for (let d = 0; d < 7; d++) {
        if (w === 0 && d < firstDay) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(day);
          day++;
        }
      }
      weeks.push(week);
    }
    this.weeks = weeks;
  }

  prevMonth() {
    this.displayDate = new Date(this.displayDate.getFullYear(), this.displayDate.getMonth() - 1, 1);
    this.updateCalendar();
  }

  nextMonth() {
    this.displayDate = new Date(this.displayDate.getFullYear(), this.displayDate.getMonth() + 1, 1);
    this.updateCalendar();
  }

  select(day: number | null) {
    if (!day) return;
    this.selected = new Date(this.displayDate.getFullYear(), this.displayDate.getMonth(), day);
  }

  isSelected(day: number | null) {
    if (!day || !this.selected) return false;
    return (
      this.selected.getFullYear() === this.displayDate.getFullYear() &&
      this.selected.getMonth() === this.displayDate.getMonth() &&
      this.selected.getDate() === day
    );
  }

  isToday(day: number | null) {
    if (!day) return false;
    const today = new Date();
    return (
      today.getFullYear() === this.displayDate.getFullYear() &&
      today.getMonth() === this.displayDate.getMonth() &&
      today.getDate() === day
    );
  }

  private formatKey(day: number) {
    const y = this.displayDate.getFullYear();
    const m = this.displayDate.getMonth() + 1;
    const d = day;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    return `${y}-${mm}-${dd}`;
  }

  hasEvent(day: number | null) {
    if (!day) return false;
    return !!this.events[this.formatKey(day)];
  }

  isSalida(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'salida' || v === 'ambas';
  }

  isPendiente(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'pendiente';
  }

  private populateSampleEvents() {
    // kept for backward compatibility but not used
    this.events = {};
  }

  private loadEventsFromReservas() {
    this.events = {};
    for (const r of this.reservas) {
      // Marcar en el calendario según estado y rol
      // El rol 'restaurante' solo debe ver reservas con alergias (como antes)
      if (this.auth.getRole() === 'restaurante' && !r.hasAllergies) continue;

      const markAsPendingForJefe = r.status === 'Pendiente' && this.auth.getRole() === 'jefe';
      const isConfirmed = r.status === 'Confirmada';

      // marcar fecha de entrada
      const di = new Date(r.fechaEntrada);
      if (!isNaN(di.getTime())) {
        const keyI = `${di.getFullYear()}-${(di.getMonth() + 1).toString().padStart(2, '0')}-${di.getDate().toString().padStart(2, '0')}`;
        if (isConfirmed) {
          if (this.events[keyI] === 'salida') this.events[keyI] = 'ambas';
          else this.events[keyI] = 'entrada';
        } else if (markAsPendingForJefe) {
          if (this.events[keyI] === 'salida' || this.events[keyI] === 'entrada' || this.events[keyI] === 'ambas') {
            this.events[keyI] = 'ambas';
          } else {
            this.events[keyI] = 'pendiente';
          }
        }
      }

      // marcar fecha de salida (solo para reservas confirmadas)
      const ds = new Date(r.fechaSalida);
      if (!isNaN(ds.getTime())) {
        const keyS = `${ds.getFullYear()}-${(ds.getMonth() + 1).toString().padStart(2, '0')}-${ds.getDate().toString().padStart(2, '0')}`;
        if (isConfirmed) {
          if (this.events[keyS] === 'entrada') this.events[keyS] = 'ambas';
          else this.events[keyS] = 'salida';
        }
        // Nota: no marcamos la fecha de salida para reservas pendientes —
        // los pendientes deben mostrarse únicamente en la fecha de entrada.
      }
    }
  }

  private loadReservas() {
    this.reservas = this.reservaService.getReservas();
  }

  get visibleReservas(): Reserva[] {
    // Prepare pool; recepcion should only see confirmed reservations
    let pool = this.reservas;
    // Recepción, Limpieza y Mantenimiento solo ven reservas confirmadas
    if (
      this.auth.getRole() === 'recepcion' ||
      this.auth.getRole() === 'limpieza' ||
      this.auth.getRole() === 'mantenimiento'
    ) {
      pool = pool.filter(r => r.status === 'Confirmada');
    }

    // Restaurante solo puede ver reservas confirmadas que tengan alergias
    if (this.auth.getRole() === 'restaurante') {
      pool = pool.filter(r => r.status === 'Confirmada' && !!r.hasAllergies);
    }

    // Si hay día seleccionado, mostrar solo reservas con esa fecha de entrada
    if (this.selected) {
      const key = `${this.selected.getFullYear()}-${(this.selected.getMonth()+1).toString().padStart(2,'0')}-${this.selected.getDate().toString().padStart(2,'0')}`;
      // Incluir reservas cuya fecha de entrada O de salida coincida con la selección
      return pool.filter(r => r.fechaEntrada === key || r.fechaSalida === key);
    }

    // Si no hay día seleccionado, mostrar reservas del mes mostrado
    const y = this.displayDate.getFullYear();
    const m = this.displayDate.getMonth();
    return pool.filter(r => {
      const d = new Date(r.fechaEntrada);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  formatDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  }

  formatCurrency(v?: number) {
    if (v == null) return '-';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }

  getInitials(r: Reserva): string {
    const name = (r?.titular || '').trim();
    if (!name) return '';
    const parts = name.split(/\s+/).filter(p => p.length > 0);
    const initials = parts.map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
    return initials;
  }

  showMonth() {
    // Quitar selección de día para mostrar todas las reservas del mes actual
    this.selected = null;
    // Forzar recálculo (no necesario pero explícito)
    this.updateCalendar();
    // Hacer scroll suave hasta la lista de reservas si existe
    try {
      const el = document.querySelector('.reservas-list') as HTMLElement | null;
      if (el) {
        // use any to avoid TS signature mismatch across lib definitions
        (el as any).scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      // noop
    }
  }
}
