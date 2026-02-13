import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api'; // Usamos ApiService
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
  
  // 'entrada', 'salida', 'ambas', 'pendiente'
  events: Record<string, 'entrada' | 'salida' | 'ambas' | 'pendiente'> = {};
  reservas: any[] = []; // Usamos any[] para permitir el mapeo dinámico

  constructor(
    private api: ApiService, 
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.updateCalendar();
    this.cargarDatos();
  }

  // Cargar datos cada vez que entras a la pestaña
  ionViewWillEnter() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getReservas().subscribe({
      next: (list) => {
        // AQUÍ ESTÁ LA MAGIA: Convertimos los datos del servidor al formato de tu diseño
        this.reservas = list.map(r => ({
          ...r,
          // Mapeamos las propiedades para que tu HTML no se rompa
          numero: r.id,
          titular: r.nombreCliente,
          status: r.estado,
          habitacion: r.selectedRoom?.name || 'Sin asignar',
          precioTotal: r.total,
          numeroHabitaciones: r.habitaciones || 1, // Por si acaso
          
          // Lógica de alergias (mira en notas y en pasajeros)
          hasAllergies: (r.notas && r.notas.trim() !== '') || r.passengers?.some((p:any) => p.allergies && p.allergies.trim() !== '')
        }));
        
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

  private loadEventsFromReservas() {
    this.events = {};
    const role = this.auth.getRole();

    for (const r of this.reservas) {
      if (role === 'restaurante' && !r.hasAllergies) continue;

      const isConfirmed = r.status === 'Confirmada';
      const markAsPendingForJefe = r.status === 'Pendiente' && role === 'jefe';

      // --- Fecha Entrada ---
      const di = new Date(r.fechaEntrada);
      if (!isNaN(di.getTime())) {
        // Formateamos la clave asegurándonos de usar UTC o Local según convenga (usamos local aquí)
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

      // --- Fecha Salida (solo confirmadas) ---
      const ds = new Date(r.fechaSalida);
      if (!isNaN(ds.getTime())) {
        const keyS = `${ds.getFullYear()}-${(ds.getMonth() + 1).toString().padStart(2, '0')}-${ds.getDate().toString().padStart(2, '0')}`;
        if (isConfirmed) {
          if (this.events[keyS] === 'entrada') this.events[keyS] = 'ambas';
          else this.events[keyS] = 'salida';
        }
      }
    }
  }

  get visibleReservas(): any[] {
    let pool = this.reservas;
    const role = this.auth.getRole();

    if (role === 'recepcion' || role === 'limpieza' || role === 'mantenimiento') {
      pool = pool.filter(r => r.status === 'Confirmada');
    }

    if (role === 'restaurante') {
      pool = pool.filter(r => r.status === 'Confirmada' && !!r.hasAllergies);
    }

    // Filtrar por selección de día
    if (this.selected) {
      const key = `${this.selected.getFullYear()}-${(this.selected.getMonth()+1).toString().padStart(2,'0')}-${this.selected.getDate().toString().padStart(2,'0')}`;
      
      // Ajuste: convertimos las fechas de la reserva al mismo formato 'YYYY-MM-DD' para comparar string con string
      return pool.filter(r => {
         const dIn = new Date(r.fechaEntrada);
         const keyIn = `${dIn.getFullYear()}-${(dIn.getMonth()+1).toString().padStart(2,'0')}-${dIn.getDate().toString().padStart(2,'0')}`;
         
         const dOut = new Date(r.fechaSalida);
         const keyOut = `${dOut.getFullYear()}-${(dOut.getMonth()+1).toString().padStart(2,'0')}-${dOut.getDate().toString().padStart(2,'0')}`;
         
         return keyIn === key || keyOut === key;
      });
    }

    // Si no hay selección, mostrar reservas del mes mostrado
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