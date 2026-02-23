import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api';

interface ReservaInput {
  id?: any;
  numero?: string;
  habitacion: string;
  titular: string;
  fechaEntrada: string;
  fechaSalida: string;
  numeroHabitaciones: number;
  adultos: number;
  ninos: number;
  precioTotal: number;
  pension: string;
  mascota: boolean;
  hasAllergies?: boolean;
  alergias?: string;
  status: string;
  estado?: string; 
  selectedCategories?: any[];
  passengers?: any[];
}

@Component({
  selector: 'app-reserva-modal',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './reserva-modal.component.html',
  styleUrls: ['./reserva-modal.component.scss']
})
export class ReservaModalComponent implements OnInit {
  @Input() initial?: Partial<ReservaInput>;

  reserva: ReservaInput = {
    habitacion: '', titular: '',
    fechaEntrada: new Date().toISOString(), 
    fechaSalida: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 0,
    pension: 'Sin pensión', mascota: false, hasAllergies: false, alergias: '',
    status: 'Pendiente', estado: 'Pendiente', selectedCategories: [], passengers: []
  };

  pensionPrices: any = {
    'Sin pensión': 0, 'Alojamiento y Desayuno': 8, 'Media Pensión': 18,
    'Pensión Completa': 30, 'Todo Incluido': 50
  };

  pensionOptions = Object.keys(this.pensionPrices);
  isRecepcion: boolean = false;
  asignaciones: any = {};
  asignacionesManuales: string[] = []; 
  habitacionesFisicas: any[] = []; 
  showBreakdown = false;
  breakdown = { nights: 0, guests: 0, roomTotal: 0, pensionTotal: 0, pensionPxN: 0, rooms: [] as any[], mathTotal: 0 };

  constructor(
    private modalCtrl: ModalController, private toastCtrl: ToastController, 
    public auth: AuthService, private api: ApiService 
  ) {}

  ngOnInit(): void {
    if (this.initial) {
      this.reserva = { ...this.reserva, ...this.initial } as ReservaInput;
      this.reserva.status = this.initial.estado || this.initial.status || 'Pendiente';
      this.reserva.estado = this.reserva.status;
      
      // Mapeo de variables de Base de Datos a Formulario
      this.reserva.adultos = (this.initial as any).adults || this.reserva.adultos;
      this.reserva.ninos = (this.initial as any).children || this.reserva.ninos;
      this.reserva.numeroHabitaciones = (this.initial as any).habitaciones || this.reserva.numeroHabitaciones;
      this.reserva.alergias = (this.initial as any).notas || this.reserva.alergias;

      if (this.initial.passengers) this.reserva.passengers = [...this.initial.passengers];
      
      if (this.reserva.habitacion && this.reserva.selectedCategories?.length) {
        const habsAsignadas = this.reserva.habitacion.split(',').map(s => s.trim());
        let count = 0;
        this.reserva.selectedCategories.forEach((cat: any) => {
          for (let j = 0; j < cat.qty; j++) {
            this.asignaciones[cat.type + '_' + j] = habsAsignadas[count] || '';
            count++;
          }
        });
      } else if (this.reserva.habitacion) {
        this.asignacionesManuales = this.reserva.habitacion.split(',').map(s => s.trim());
      }
    }
    
    this.isRecepcion = String(this.auth.getRole() || '').toLowerCase() === 'recepcion';

    this.api.getHabitaciones().subscribe({
      next: (data: any) => {
        this.habitacionesFisicas = data || [];
        this.recalculatePrice(false);
      },
      error: () => this.recalculatePrice(false)
    });
  }

  // Lógica para que al cambiar el número de habitaciones aparezcan/desaparezcan selectores
  onRoomCountChange() {
    if (this.reserva.numeroHabitaciones < 1) this.reserva.numeroHabitaciones = 1;
    
    const targetLength = this.reserva.numeroHabitaciones;
    const currentLength = this.asignacionesManuales.length;

    if (targetLength > currentLength) {
      for (let i = 0; i < targetLength - currentLength; i++) {
        this.asignacionesManuales.push('');
      }
    } else if (targetLength < currentLength) {
      this.asignacionesManuales = this.asignacionesManuales.slice(0, targetLength);
    }
    this.updateManualRooms();
  }

  updateManualRooms() {
    this.reserva.habitacion = this.asignacionesManuales.filter(h => h).join(', ');
    this.recalculatePrice();
  }

  recalculatePrice(overwritePrice = true) {
    const ci = new Date(this.reserva.fechaEntrada);
    const co = new Date(this.reserva.fechaSalida);
    let nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) nights = 1; 

    const guests = (Number(this.reserva.adultos) || 0) + (Number(this.reserva.ninos) || 0);
    const pensionPxN = this.pensionPrices[this.reserva.pension] || 0;
    const pensionTotal = pensionPxN * guests * nights;

    let roomTotal = 0;
    const roomsInfo: any[] = [];

    // Si viene de Web (Categorías)
    if (this.reserva.selectedCategories && this.reserva.selectedCategories.length > 0) {
      this.reserva.selectedCategories.forEach((cat: any) => {
        const t = cat.price * cat.qty * nights;
        roomTotal += t;
        roomsInfo.push({ name: cat.name, qty: cat.qty, price: cat.price, total: t });
      });
    } 
    // Si es asignación manual
    else {
      const roomNumbers = this.reserva.habitacion.split(',').map(s => s.trim()).filter(s => s);
      roomNumbers.forEach(roomNumber => {
        const room = this.habitacionesFisicas.find(h => h.numero === roomNumber);
        if (room) {
          const rp = Number(room.precio || room.price || 0);
          roomTotal += (rp * nights);
          roomsInfo.push({ name: `Hab. ${room.numero}`, qty: 1, price: rp, total: rp * nights });
        }
      });
      
      // Si el número de habitaciones asignadas es menor al solicitado, mostramos el resto como 0€
      if (roomNumbers.length < this.reserva.numeroHabitaciones) {
        roomsInfo.push({ name: 'Sin asignar', qty: this.reserva.numeroHabitaciones - roomNumbers.length, price: 0, total: 0 });
      }
    }

    const mathTotal = roomTotal + pensionTotal;
    this.breakdown = { nights, guests, roomTotal, pensionTotal, pensionPxN, rooms: roomsInfo, mathTotal };

    if (overwritePrice) {
      this.reserva.precioTotal = mathTotal;
    }
  }

  selectPension(p: string) {
    this.reserva.pension = p;
    this.recalculatePrice();
  }

  addPassenger() {
    if (!this.reserva.passengers) this.reserva.passengers = [];
    this.reserva.passengers.push({ name: '', dni: '', isPrimary: false, type: 'adult' });
  }

  async removePassenger(index: number) {
    if (!this.reserva.passengers) return;
    const p = this.reserva.passengers[index];
    
    // Descontar del contador según tipo
    if (p.type === 'child' || p.type === 'niño') {
      this.reserva.ninos = Math.max(0, this.reserva.ninos - 1);
    } else {
      this.reserva.adultos = Math.max(1, this.reserva.adultos - 1);
    }
    
    this.reserva.passengers.splice(index, 1);
    this.recalculatePrice(true);
  }

  getAvailableRoomsManual(index: number): any[] {
    const asignadasPorOtros = this.asignacionesManuales.filter((val, i) => val && i !== index);
    return this.habitacionesFisicas.filter(h => 
      (h.estado === 'Libre' || h.numero === this.asignacionesManuales[index]) && 
      !asignadasPorOtros.includes(h.numero)
    );
  }

  getAvailableRooms(type: string): any[] {
    const asignadasActuales = this.reserva.habitacion ? this.reserva.habitacion.split(',').map(s => s.trim()) : [];
    return this.habitacionesFisicas.filter(h => 
      h.tipo === type && (h.estado === 'Libre' || asignadasActuales.includes(h.numero)) 
    );
  }

  getArray(n: number): any[] { return Array(n); }
  cancel() { this.modalCtrl.dismiss(); }
  setEstado(nuevoEstado: string) { this.reserva.status = nuevoEstado; this.reserva.estado = nuevoEstado; }

  async save() {
    this.reserva.estado = this.reserva.status;

    if (!this.reserva.titular || !this.reserva.fechaEntrada || !this.reserva.fechaSalida) {
      const toast = await this.toastCtrl.create({
        message: 'Faltan campos obligatorios.',
        duration: 2000, color: 'danger', position: 'top'
      });
      toast.present(); return;
    }

    // Mapeo final para persistencia en Base de Datos
    const payloadParaGuardar = {
      ...this.reserva,
      adults: this.reserva.adultos, 
      children: this.reserva.ninos, 
      habitaciones: this.reserva.numeroHabitaciones,
      notas: this.reserva.hasAllergies ? this.reserva.alergias : '',
      pension: this.reserva.pension,
      total: this.reserva.precioTotal // Aseguramos que se guarde el total calculado
    };

    this.modalCtrl.dismiss({ reserva: payloadParaGuardar });
  }

  async cancelAsClient() {
    this.setEstado('Cancelada por cliente');
    this.modalCtrl.dismiss({ reserva: this.reserva });
  }
}