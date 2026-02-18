import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api'; 
import { AuthService } from '../services/auth.service';

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
  
  // Tipos específicos para controlar colores: 'entrada' (verde), 'salida' (rojo), etc.
  events: Record<string, 'entrada' | 'salida' | 'ambas' | 'completada' | 'pendiente'> = {};
  reservas: any[] = []; 

  constructor(
    private api: ApiService, 
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.updateCalendar();
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  cargarDatos() {
    const userRole = this.auth.getRole();
    
    this.api.getReservas().subscribe({
      next: (list) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let filteredList = list;

        if (userRole !== 'jefe') {
          filteredList = list.filter(r => {
            if (!r.fechaSalida) return false;
            const salida = new Date(r.fechaSalida);
            return salida >= hoy; 
          });
        }

        this.reservas = filteredList.map(r => {
          const salida = new Date(r.fechaSalida);
          const esAntigua = salida.getTime() < hoy.getTime();
          
          let estadoVisual = r.estado;
          if (r.estado === 'Confirmada' && esAntigua) {
            estadoVisual = 'Completada';
          }

          return {
            ...r,
            numero: r.id,
            titular: r.nombreCliente,
            status: estadoVisual,
            habitacion: r.selectedRoom?.name || 'Sin asignar',
            precioTotal: r.total,
            numeroHabitaciones: r.habitaciones || 1,
            hasAllergies: (r.notas && r.notas.trim() !== '') || r.passengers?.some((p:any) => p.allergies && p.allergies.trim() !== '')
          };
        });
        
        this.loadEventsFromReservas();
      },
      error: (err) => console.error('Error cargando calendario:', err)
    });
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
      if (day > daysInMonth) break;
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

  // Helper para generar clave de fecha
  private formatKey(day: number) {
    const y = this.displayDate.getFullYear();
    const m = this.displayDate.getMonth() + 1;
    const d = day;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    return `${y}-${mm}-${dd}`;
  }

  // --- LOGICA PRINCIPAL DE PUNTOS ---
  private loadEventsFromReservas() {
    this.events = {};
    const role = this.auth.getRole();

    for (const r of this.reservas) {
      if (role === 'restaurante' && !r.hasAllergies) continue;

      const di = new Date(r.fechaEntrada);
      const ds = new Date(r.fechaSalida);

      // Claves de fecha string 'YYYY-MM-DD'
      let keyI = null;
      let keyS = null;

      if (!isNaN(di.getTime())) {
        keyI = `${di.getFullYear()}-${(di.getMonth() + 1).toString().padStart(2, '0')}-${di.getDate().toString().padStart(2, '0')}`;
      }
      if (!isNaN(ds.getTime())) {
        keyS = `${ds.getFullYear()}-${(ds.getMonth() + 1).toString().padStart(2, '0')}-${ds.getDate().toString().padStart(2, '0')}`;
      }

      // 1. COMPLETADA: Solo Entrada (GRIS)
      if (r.status === 'Completada') {
        if (keyI) this.events[keyI] = 'completada';
      } 
      // 2. CONFIRMADA: Entrada (VERDE) y Salida (ROJO)
      else if (r.status === 'Confirmada') {
        if (keyI) {
          // Si ya había una salida ese día, ahora es "ambas"
          if (this.events[keyI] === 'salida') this.events[keyI] = 'ambas';
          else this.events[keyI] = 'entrada';
        }
        if (keyS) {
          // Si ya había una entrada ese día, ahora es "ambas"
          if (this.events[keyS] === 'entrada') this.events[keyS] = 'ambas';
          else this.events[keyS] = 'salida';
        }
      } 
      // 3. PENDIENTE: Solo Entrada (NARANJA) - Solo para Jefe
      else if (r.status === 'Pendiente' && role === 'jefe') {
        if (keyI) this.events[keyI] = 'pendiente';
      }
    }
  }

  // --- HELPERS PARA HTML ---
  hasEvent(day: number | null) {
    if (!day) return false;
    return !!this.events[this.formatKey(day)];
  }

  isEntrada(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'entrada';
  }

  isSalida(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'salida';
  }

  isAmbas(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'ambas';
  }

  isCompletada(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'completada';
  }

  isPendiente(day: number | null) {
    if (!day) return false;
    const v = this.events[this.formatKey(day)];
    return v === 'pendiente';
  }

  // --- LISTADO INFERIOR ---
  get visibleReservas(): any[] {
    let pool = this.reservas;
    const role = this.auth.getRole();

    if (role === 'recepcion' || role === 'limpieza' || role === 'mantenimiento') {
      pool = pool.filter(r => r.status === 'Confirmada' || r.status === 'Completada');
    }

    if (role === 'restaurante') {
      pool = pool.filter(r => (r.status === 'Confirmada' || r.status === 'Completada') && !!r.hasAllergies);
    }

    if (this.selected) {
      const key = `${this.selected.getFullYear()}-${(this.selected.getMonth()+1).toString().padStart(2,'0')}-${this.selected.getDate().toString().padStart(2,'0')}`;
      
      return pool.filter(r => {
         const dIn = new Date(r.fechaEntrada);
         const keyIn = `${dIn.getFullYear()}-${(dIn.getMonth()+1).toString().padStart(2,'0')}-${dIn.getDate().toString().padStart(2,'0')}`;
         
         const dOut = new Date(r.fechaSalida);
         const keyOut = `${dOut.getFullYear()}-${(dOut.getMonth()+1).toString().padStart(2,'0')}-${dOut.getDate().toString().padStart(2,'0')}`;
         
         return keyIn === key || keyOut === key;
      });
    }

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

  getInitials(r: any): string {
    const name = (r?.titular || '').trim();
    if (!name) return '';
    const parts = name.split(/\s+/).filter((p: string) => p.length > 0);
    const initials = parts.map((p: string) => p.charAt(0).toUpperCase()).slice(0, 2).join('');
    return initials;
  }

  showMonth() {
    this.selected = null;
    this.updateCalendar();
    try {
      const el = document.querySelector('.reservas-list') as HTMLElement | null;
      if (el) {
        (el as any).scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) { }
  }
}