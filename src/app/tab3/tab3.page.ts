import { Component, OnInit } from '@angular/core';
import { ReservaService } from '../services/reserva.service';
import type { Reserva } from '../services/reserva.service';

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
  events: Record<string, boolean> = {};
  reservas: Reserva[] = [];

  constructor(private reservaService: ReservaService) {}

  ngOnInit(): void {
    this.updateCalendar();
    this.loadEventsFromReservas();
    this.loadReservas();
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

  private populateSampleEvents() {
    // kept for backward compatibility but not used
    this.events = {};
  }

  private loadEventsFromReservas() {
    this.events = {};
    const reservas = this.reservaService.getReservas();
    for (const r of reservas) {
      const d = new Date(r.fechaEntrada);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
      this.events[key] = true;
    }
  }

  private loadReservas() {
    this.reservas = this.reservaService.getReservas();
  }

  get visibleReservas(): Reserva[] {
    // Si hay día seleccionado, mostrar solo reservas con esa fecha de entrada
    if (this.selected) {
      const key = `${this.selected.getFullYear()}-${(this.selected.getMonth()+1).toString().padStart(2,'0')}-${this.selected.getDate().toString().padStart(2,'0')}`;
      return this.reservas.filter(r => r.fechaEntrada === key);
    }
    // Si no hay día seleccionado, mostrar reservas del mes mostrado
    const y = this.displayDate.getFullYear();
    const m = this.displayDate.getMonth();
    return this.reservas.filter(r => {
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
