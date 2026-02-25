import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { ModalController, ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-reserva-modal',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './reserva-modal.component.html',
  styleUrls: ['./reserva-modal.component.scss']
})
export class ReservaModalComponent implements OnInit {
  @Input() initial?: any;

  reserva: any = {
    habitacion: '', titular: '',
    fechaEntrada: new Date().toISOString(), 
    fechaSalida: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    numeroHabitaciones: 1, adultos: 1, ninos: 0, precioTotal: 0,
    pension: 'Sin Pensión', mascota: false, hasAllergies: false, alergias: '',
    status: 'Pendiente', estado: 'Pendiente', selectedCategories: [], passengers: []
  };

  pensionOptions = ['Sin Pensión', 'Solo Desayuno', 'Media Pensión', 'Pensión Completa', 'Todo Incluido'];
  baseRoomPriceTotal = 0; 

  isRecepcion: boolean = false;
  asignaciones: any = {};
  asignacionesManuales: string[] = []; 
  habitacionesFisicas: any[] = [];
  todasLasReservas: any[] = [];
  showBreakdown = false;
  breakdown = { nights: 1, guests: 1, roomTotal: 0, pensionTotal: 0, pensionPxN: 0, rooms: [] as any[], mathTotal: 0 };

  passengersErrors: Array<any> = [];
  editingIndex: number | null = null;
  formVisible = false;

  constructor(
    private modalCtrl: ModalController, 
    private toastCtrl: ToastController, 
    public auth: AuthService, 
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.initial) {
      this.reserva = JSON.parse(JSON.stringify(this.initial));
      this.reserva.status = this.initial.estado || this.initial.status || 'Pendiente';
      this.reserva.estado = this.reserva.status;
      
      let pen = String(this.initial.pension || this.initial.selectedPension?.name || '').toLowerCase();
      if (pen.includes('desayuno')) this.reserva.pension = 'Solo Desayuno';
      else if (pen.includes('media')) this.reserva.pension = 'Media Pensión';
      else if (pen.includes('completa')) this.reserva.pension = 'Pensión Completa';
      else if (pen.includes('incluido')) this.reserva.pension = 'Todo Incluido';
      else this.reserva.pension = 'Sin Pensión';

      this.reserva.adultos = parseInt(this.initial.adults ?? this.initial.adultos, 10) || 1;
      this.reserva.ninos = parseInt(this.initial.children ?? this.initial.ninos, 10) || 0;
      this.reserva.numeroHabitaciones = parseInt(this.initial.habitaciones ?? this.initial.numeroHabitaciones, 10) || 1;
      
      // === TRADUCTOR DE MASCOTAS PARA ADMIN ===
      const rawPet = this.initial.mascota ?? this.initial.pets ?? this.initial.mascotas;
      this.reserva.mascota = (rawPet === true || rawPet === 'true' || rawPet === 'Si' || rawPet === 'Sí' || rawPet === 1);

      const initialTotal = parseFloat(String(this.initial.precioTotal || this.initial.total || 0)) || 0;
      
      let ci = new Date(this.reserva.fechaEntrada);
      let co = new Date(this.reserva.fechaSalida);
      if (isNaN(ci.getTime())) ci = new Date();
      if (isNaN(co.getTime())) { co = new Date(ci); co.setDate(co.getDate() + 1); }
      
      let initNights = Math.ceil((co.getTime() - ci.getTime()) / 86400000);
      if (initNights <= 0) initNights = 1;
      
      const initPxN = this.getPensionPrice(this.reserva.pension);
      const initPensionTotal = initPxN * (this.reserva.adultos + this.reserva.ninos) * initNights;
      
      this.baseRoomPriceTotal = Math.max(0, initialTotal - initPensionTotal);
      if (isNaN(this.baseRoomPriceTotal)) this.baseRoomPriceTotal = 0;

      let notasOriginales = this.initial.alergias || this.initial.notas || '';
      if (notasOriginales.trim().toLowerCase() === 'ninguna') {
        notasOriginales = ''; 
      }
      this.reserva.alergias = notasOriginales;
      this.reserva.hasAllergies = this.initial.hasAllergies === true || this.reserva.alergias.trim() !== '';

      if (!this.reserva.passengers) this.reserva.passengers = [];
      this.initPassengersErrors();
      this.syncTitularToPassengers();
      
      if (this.reserva.habitacion && this.reserva.selectedCategories?.length > 0) {
        const habsAsignadas = this.reserva.habitacion.split(',').map((s:string) => s.trim());
        let count = 0;
        this.reserva.selectedCategories.forEach((cat: any) => {
          for (let j = 0; j < cat.qty; j++) {
            this.asignaciones[cat.type + '_' + j] = habsAsignadas[count] || '';
            count++;
          }
        });
        if (habsAsignadas.length > count) {
          this.asignacionesManuales = habsAsignadas.slice(count);
        }
      } else if (this.reserva.habitacion) {
        this.asignacionesManuales = this.reserva.habitacion.split(',').map((s:string) => s.trim());
      }
    } else {
      this.initPassengersErrors();
    }
    
    this.isRecepcion = String(this.auth.getRole() || '').toLowerCase() === 'recepcion';

    // DESCARGAMOS HABITACIONES Y RESERVAS SIMULTÁNEAMENTE
    forkJoin({
      habs: this.api.getHabitaciones(),
      res: this.api.getReservas()
    }).subscribe({
      next: (data: any) => {
        this.habitacionesFisicas = data.habs || [];
        this.todasLasReservas = data.res || [];

        if (!this.reserva.selectedCategories || this.reserva.selectedCategories.length === 0) {
          const target = Number(this.reserva.numeroHabitaciones) || 1;
          while (this.asignacionesManuales.length < target) {
            this.asignacionesManuales.push('');
          }
        }
        this.syncTotalRooms();
        this.recalculatePrice(false);
      },
      error: () => this.recalculatePrice(false)
    });
  }

  // === COMPROBADOR DE DISPONIBILIDAD POR FECHA ===
  isRoomAvailableForDates(roomNumber: string): boolean {
    const inDate = new Date(this.reserva.fechaEntrada).getTime();
    const outDate = new Date(this.reserva.fechaSalida).getTime();

    const isOccupied = this.todasLasReservas.some(r => {
      if (this.reserva.id && r.id === this.reserva.id) return false; // Ignorar esta misma reserva
      
      const est = (r.estado || r.status || '').toLowerCase();
      if (est.includes('cancelada') || est.includes('denegada')) return false;

      const asignadas = (r.habitacion || '').split(',').map((h:string) => h.trim());
      if (!asignadas.includes(String(roomNumber))) return false;

      const rIn = new Date(r.fechaEntrada).getTime();
      const rOut = new Date(r.fechaSalida).getTime();

      return (inDate < rOut && rIn < outDate);
    });

    return !isOccupied;
  }

  getPensionPrice(pensionName: string): number {
    if (!pensionName) return 0;
    const p = String(pensionName).trim().toLowerCase();
    if (p.includes('desayuno')) return 8;
    if (p.includes('media')) return 18;
    if (p.includes('completa')) return 30;
    if (p.includes('incluido')) return 50;
    return 0;
  }

  trackByIndex(index: number) { return index; }
  trackByGroup(index: number, group: any) { return group.tipo; }
  trackByRoom(index: number, room: any) { return room.numero; }

  get webRoomsCount(): number {
    if (!this.reserva.selectedCategories) return 0;
    return this.reserva.selectedCategories.reduce((sum:number, cat:any) => sum + (Number(cat.qty) || 0), 0);
  }

  syncTotalRooms() {
    this.reserva.numeroHabitaciones = this.webRoomsCount + this.asignacionesManuales.length;
    if (this.reserva.numeroHabitaciones < 1) {
      this.reserva.numeroHabitaciones = 1;
      this.asignacionesManuales.push('');
    }
  }

  changeRooms(delta: number) {
    if (delta > 0) {
      this.asignacionesManuales.push('');
    } else {
      if (this.reserva.numeroHabitaciones <= 1) return;
      if (this.asignacionesManuales.length > 0) {
        this.asignacionesManuales.pop(); 
      } else if (this.reserva.selectedCategories && this.reserva.selectedCategories.length > 0) {
        for (let i = this.reserva.selectedCategories.length - 1; i >= 0; i--) {
          if (this.reserva.selectedCategories[i].qty > 0) {
            const indexToRemove = this.reserva.selectedCategories[i].qty - 1;
            const keyToRemove = this.reserva.selectedCategories[i].type + '_' + indexToRemove;
            delete this.asignaciones[keyToRemove]; 
            this.reserva.selectedCategories[i].qty--;
            if (this.reserva.selectedCategories[i].qty === 0) {
              this.reserva.selectedCategories.splice(i, 1);
            }
            break;
          }
        }
      }
    }
    this.syncTotalRooms();
    this.updateRooms();
  }

  updateRooms() {
    const habs: string[] = [];
    if (this.reserva.selectedCategories && this.reserva.selectedCategories.length > 0) {
      this.reserva.selectedCategories.forEach((cat: any) => {
        for (let j = 0; j < cat.qty; j++) {
          const val = this.asignaciones[cat.type + '_' + j];
          if (val && val !== 'Sin asignar') habs.push(val.trim());
        }
      });
    }
    this.asignacionesManuales.forEach(h => {
      if (h && h !== 'Sin asignar') habs.push(h.trim());
    });
    this.reserva.habitacion = habs.join(', ') || 'Sin asignar';
    this.recalculatePrice(true); 
  }

  changeGuests(type: 'adultos' | 'ninos', delta: number) {
    if (type === 'adultos') {
      const current = parseInt(this.reserva.adultos, 10) || 1;
      const newVal = Math.max(1, current + delta);
      if (delta < 0 && this.countAdults() > newVal) {
        this.removeLastPassengerOfType('adult');
      }
      this.reserva.adultos = newVal;
    } else {
      const current = parseInt(this.reserva.ninos, 10) || 0;
      const newVal = Math.max(0, current + delta);
      if (delta < 0 && this.countChildren() > newVal) {
        this.removeLastPassengerOfType('child');
      }
      this.reserva.ninos = newVal;
    }
    this.recalculatePrice(true);
  }

  removeLastPassengerOfType(type: string) {
    if (!this.reserva.passengers) return;
    for (let i = this.reserva.passengers.length - 1; i >= 0; i--) {
      if (this.reserva.passengers[i].type === type && !this.reserva.passengers[i].isPrimary) {
        this.reserva.passengers.splice(i, 1);
        this.passengersErrors.splice(i, 1);
        if (this.editingIndex === i) {
          this.editingIndex = null;
        } else if (this.editingIndex !== null && this.editingIndex > i) {
          this.editingIndex--;
        }
        break; 
      }
    }
  }

  get totalAllowed() { return Number(this.reserva.adultos || 0) + Number(this.reserva.ninos || 0); }
  countAdults() { return this.reserva.passengers?.filter((p:any) => p.type === 'adult').length || 0; }
  countChildren() { return this.reserva.passengers?.filter((p:any) => p.type === 'child').length || 0; }
  canAddPassenger() { return (this.reserva.passengers?.length || 0) < this.totalAllowed; }

  initPassengersErrors() {
    if (!this.reserva.passengers) this.reserva.passengers = [];
    this.passengersErrors = this.reserva.passengers.map(() => ({
      name: false, lastName: false, dni: false, phone: false, email: false
    }));
  }

  syncTitularToPassengers() {
    if (!this.reserva.titular || !this.reserva.passengers) return;
    if (this.reserva.passengers.length === 0) {
      this.reserva.passengers.push({ 
        isPrimary: true, name: this.reserva.titular, lastName: '', phone: '', email: '', dni: '', allergies: '', type: 'adult' 
      });
      this.passengersErrors.push({ name: false, lastName: false, dni: false, phone: false, email: false });
    } else {
      this.reserva.passengers[0].name = this.reserva.titular;
    }
  }

  updateTitularFromInput(ev: any) {
    this.reserva.titular = ev.target.value;
    if (this.reserva.passengers && this.reserva.passengers.length > 0) {
      this.reserva.passengers[0].name = this.reserva.titular;
    } else {
      this.syncTitularToPassengers();
    }
  }

  togglePassengers() { this.formVisible = !this.formVisible; }
  hasPrimary() { return this.reserva.passengers?.some((p:any) => p.isPrimary); }

  addPrimary() {
    if (this.hasPrimary()) return;
    this.reserva.passengers!.unshift({ isPrimary: true, name: this.reserva.titular || '', lastName: '', phone: '', email: '', dni: '', allergies: '', type: 'adult' });
    this.passengersErrors.unshift({ name: false, lastName: false, dni: false, phone: false, email: false });
    this.formVisible = true;
    this.editingIndex = 0;
  }

  addPassenger() {
    if (!this.canAddPassenger()) {
      this.toastCtrl.create({ message: 'Límite de pasajeros alcanzado', duration: 2000, color: 'warning' }).then(t => t.present());
      return;
    }
    let defaultType: 'adult' | 'child' = 'adult';
    if (this.countAdults() >= Number(this.reserva.adultos) && this.countChildren() < Number(this.reserva.ninos)) {
      defaultType = 'child';
    }
    this.reserva.passengers!.push({ isPrimary: false, name: '', lastName: '', dni: '', allergies: '', type: defaultType });
    this.passengersErrors.push({ name: false, lastName: false, dni: false, phone: false, email: false });
    this.formVisible = true;
    this.editingIndex = this.reserva.passengers!.length - 1;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  removePassenger(index: number) {
    if (index >= 0 && index < this.reserva.passengers!.length) {
      const p = this.reserva.passengers![index];
      if (p.type === 'child') this.reserva.ninos = Math.max(0, this.reserva.ninos - 1);
      else this.reserva.adultos = Math.max(1, this.reserva.adultos - 1);

      this.reserva.passengers!.splice(index, 1);
      this.passengersErrors.splice(index, 1);
      
      if (this.editingIndex !== null) {
        if (this.editingIndex === index) this.editingIndex = null;
        else if (this.editingIndex > index) this.editingIndex--;
      }
      this.recalculatePrice(true);
    }
  }

  editPassenger(index: number) {
    if (index < 0 || index >= this.reserva.passengers!.length) return;
    this.formVisible = true;
    this.editingIndex = index;
  }

  closeEditing() { this.editingIndex = null; }

  validatePassenger(p: any) {
    const errors: any = { name: false, lastName: false, dni: false, phone: false, email: false };
    const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]{2,}$/;
    const dniRe = /^\d{8}[A-Za-z]$/; 
    const phoneRe = /^\d{9}$/; 
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!p.name || !nameRe.test(String(p.name).trim())) errors.name = true;
    if (!p.lastName || !nameRe.test(String(p.lastName).trim())) errors.lastName = true;
    if (p.dni && !dniRe.test(String(p.dni).trim())) errors.dni = true; 
    
    if (p.isPrimary) {
      if (p.phone && !phoneRe.test(String(p.phone).trim())) errors.phone = true;
      if (p.email && !emailRe.test(String(p.email).trim())) errors.email = true;
    }
    return errors;
  }

  async savePassengers() {
    let firstInvalid: number | null = null;
    for (let i = 0; i < this.reserva.passengers!.length; i++) {
      const p = this.reserva.passengers![i];
      const errs = this.validatePassenger(p);
      this.passengersErrors[i] = errs;
      if (firstInvalid === null && Object.values(errs).some(v => v === true)) firstInvalid = i;
    }
    
    if (firstInvalid !== null) {
      this.editingIndex = firstInvalid;
      this.toastCtrl.create({ message: 'Revisa los campos en rojo', duration: 2200, color: 'danger', position: 'bottom' }).then(t => t.present());
      return;
    }

    const primary = this.reserva.passengers!.find((p:any) => p.isPrimary);
    if (primary) this.reserva.titular = primary.name;

    this.toastCtrl.create({ message: 'Pasajero guardado', duration: 1500, color: 'success', position: 'bottom' }).then(t => t.present());
    this.formVisible = false;
    this.editingIndex = null;
  }

  recalculatePrice(overwritePrice = true) {
    let ci = new Date(this.reserva.fechaEntrada);
    let co = new Date(this.reserva.fechaSalida);
    if (isNaN(ci.getTime())) ci = new Date();
    if (isNaN(co.getTime())) { co = new Date(ci); co.setDate(co.getDate() + 1); }

    let nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000);
    if (isNaN(nights) || nights <= 0) nights = 1; 

    const ad = parseInt(this.reserva.adultos, 10) || 0;
    const ni = parseInt(this.reserva.ninos, 10) || 0;
    const guests = ad + ni;

    const pensionPxN = this.getPensionPrice(this.reserva.pension);
    const pensionTotal = pensionPxN * guests * nights;

    let roomTotal = 0;
    let hasPhysicalPricedRooms = false;
    const roomsInfo: any[] = [];

    if (this.reserva.selectedCategories?.length > 0) {
      this.reserva.selectedCategories.forEach((cat: any) => {
        const price = Number(cat.price || 0);
        const qty = Number(cat.qty || 1);
        const t = price * qty * nights;
        roomTotal += t;
        hasPhysicalPricedRooms = true;
        roomsInfo.push({ name: `Web: ${cat.name}`, qty: qty, price: price, total: t });
      });
    } 

    if (this.asignacionesManuales?.length > 0) {
      this.asignacionesManuales.forEach(roomNumber => {
        if (roomNumber && roomNumber !== 'Sin asignar') {
          const room = this.habitacionesFisicas.find(h => String(h.numero) === String(roomNumber));
          const rp = Number(room?.precio || room?.price || 0);
          if (rp > 0) {
            roomTotal += (rp * nights);
            hasPhysicalPricedRooms = true;
            roomsInfo.push({ name: `Extra: Hab. ${roomNumber}`, qty: 1, price: rp, total: rp * nights });
          } else {
            roomsInfo.push({ name: `Hab. ${roomNumber} (Base)`, qty: 1, price: 0, total: 0 });
          }
        } else {
          roomsInfo.push({ name: 'Hab. Extra (Por asignar)', qty: 1, price: 0, total: 0 });
        }
      });
    }

    if (!hasPhysicalPricedRooms && this.baseRoomPriceTotal > 0) {
      roomTotal = this.baseRoomPriceTotal;
      roomsInfo.push({ name: 'Tarifa Base Manual', qty: 1, price: roomTotal/nights, total: roomTotal });
    }

    let mathTotal = roomTotal + pensionTotal;
    if (isNaN(mathTotal)) mathTotal = 0;

    this.breakdown = { nights, guests, roomTotal, pensionTotal, pensionPxN, rooms: roomsInfo, mathTotal };

    if (overwritePrice) {
      this.reserva.precioTotal = mathTotal;
    }
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  selectPension(p: string) {
    this.reserva.pension = p;
    this.recalculatePrice(true);
  }

  groupedAvailableRoomsManual(index: number): any[] {
    const selectedByWeb: string[] = [];
    if (this.reserva.selectedCategories) {
      this.reserva.selectedCategories.forEach((cat: any) => {
        for (let j = 0; j < cat.qty; j++) {
          const val = this.asignaciones[cat.type + '_' + j];
          if (val && val !== 'Sin asignar') selectedByWeb.push(val.trim());
        }
      });
    }

    const currentRoom = this.asignacionesManuales[index];
    const asignadasPorOtrosManuales = this.asignacionesManuales.filter((val, i) => val && val !== 'Sin asignar' && i !== index);
    const allOtherSelected = [...selectedByWeb, ...asignadasPorOtrosManuales];

    // FILTRAMOS POR FECHA EN LUGAR DE ESTADO LIBRE
    const available = this.habitacionesFisicas.filter(h => 
      (this.isRoomAvailableForDates(h.numero) || h.numero === currentRoom) && 
      !allOtherSelected.includes(h.numero)
    );

    const groups: any = {};
    available.forEach(room => {
      const tipo = room.tipo || 'General';
      const precio = Number(room.precio || room.price || 0);
      if (!groups[tipo]) groups[tipo] = { tipo, precio, rooms: [] };
      groups[tipo].rooms.push(room);
    });

    return Object.values(groups);
  }

  getAvailableRooms(type: string, currentKey: string): any[] {
    const selectedByManuals = this.asignacionesManuales.filter(h => h && h !== 'Sin asignar');
    const selectedByOtherWeb: string[] = [];
    Object.keys(this.asignaciones).forEach(key => {
       if (key !== currentKey && this.asignaciones[key] && this.asignaciones[key] !== 'Sin asignar') {
         selectedByOtherWeb.push(this.asignaciones[key].trim());
       }
    });
    const allOthers = [...selectedByManuals, ...selectedByOtherWeb];

    // FILTRAMOS POR FECHA EN LUGAR DE ESTADO LIBRE
    return this.habitacionesFisicas.filter(h => 
      h.tipo === type && 
      (this.isRoomAvailableForDates(h.numero) || h.numero === this.asignaciones[currentKey]) &&
      !allOthers.includes(h.numero)
    );
  }

  getArray(n: number): any[] { return Array(Number(n) || 0); }
  cancel() { this.modalCtrl.dismiss(); }
  setEstado(nuevoEstado: string) { this.reserva.status = nuevoEstado; this.reserva.estado = nuevoEstado; }

  async save() {
    this.reserva.estado = this.reserva.status;

    if (!this.reserva.titular || !this.reserva.fechaEntrada || !this.reserva.fechaSalida) {
      this.toastCtrl.create({ message: 'Faltan campos obligatorios.', duration: 2000, color: 'danger', position: 'top' }).then(t=>t.present());
      return;
    }

    if (this.editingIndex !== null) {
      this.toastCtrl.create({ message: 'Guarda el pasajero que estás editando primero.', duration: 2500, color: 'warning', position: 'top' }).then(t=>t.present());
      return;
    }

    if (this.reserva.estado !== 'Denegada' && !this.reserva.estado.includes('Cancelada')) {
      let faltan = false;
      if (this.reserva.selectedCategories) {
        this.reserva.selectedCategories.forEach((cat: any) => {
          for (let j = 0; j < cat.qty; j++) {
            if (!this.asignaciones[cat.type + '_' + j]?.trim() || this.asignaciones[cat.type + '_' + j] === 'Sin asignar') faltan = true;
          }
        });
      }
      this.asignacionesManuales.forEach(h => {
        if (!h || h.trim() === '' || h === 'Sin asignar') faltan = true;
      });

      if (this.reserva.estado === 'Confirmada' && faltan) {
        this.toastCtrl.create({ message: 'Asigna un número a TODAS las habitaciones.', duration: 3500, color: 'warning', position: 'top' }).then(t=>t.present());
        return;
      }
    }

    let payloadParaGuardar: any = {
      ...this.reserva,
      adults: Number(this.reserva.adultos) || 1, 
      adultos: Number(this.reserva.adultos) || 1, 
      children: Number(this.reserva.ninos) || 0, 
      ninos: Number(this.reserva.ninos) || 0, 
      habitaciones: Number(this.reserva.numeroHabitaciones) || 1,
      numeroHabitaciones: Number(this.reserva.numeroHabitaciones) || 1,
      notas: this.reserva.hasAllergies ? this.reserva.alergias : '',
      
      // Aseguramos guardar el estado de la mascota limpiamente
      mascota: this.reserva.mascota,

      pension: this.reserva.pension,
      selectedPension: {
        name: this.reserva.pension,
        price: this.getPensionPrice(this.reserva.pension),
        includes: []
      },

      habitacion: this.reserva.habitacion === 'Sin asignar' ? '' : this.reserva.habitacion,
      total: Number(this.reserva.precioTotal) || 0,
      precioTotal: Number(this.reserva.precioTotal) || 0,
      selectedCategories: this.reserva.selectedCategories || [],
      passengers: this.reserva.passengers || []
    };

    Object.keys(payloadParaGuardar).forEach(key => {
      if (payloadParaGuardar[key] === undefined) {
        delete payloadParaGuardar[key];
      }
    });

    this.modalCtrl.dismiss({ reserva: payloadParaGuardar });
  }

  async cancelAsClient() {
    this.setEstado('Cancelada por cliente');
    this.save(); 
  }
}