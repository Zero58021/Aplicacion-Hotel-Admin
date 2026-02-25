import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController, IonContent, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api'; 
import { AuthService } from '../services/auth.service';

// IMPORTACIONES PARA EL TICKET PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  reservas: any[] = [];
  searchTerm: string = '';
  statusFilter: string = 'Todos'; 

  @ViewChild(IonContent, { static: false }) content!: IonContent;
  showScrollTop: boolean = false;

  pensionPrices: any = {
    'Sin Pensión': 0,
    'Solo Desayuno': 8,
    'Media Pensión': 18,
    'Pensión Completa': 30,
    'Todo Incluido': 50
  };

  habitacionesFisicasCache: any[] = [];

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController, 
    private api: ApiService, 
    public auth: AuthService,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController // <-- Añadido para el PDF
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.api.getHabitaciones().subscribe(data => {
      this.habitacionesFisicasCache = data || [];
    });
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  normalizePensionName(name: string): string {
    const p = String(name || '').toLowerCase();
    if (p.includes('desayuno')) return 'Solo Desayuno';
    if (p.includes('media')) return 'Media Pensión';
    if (p.includes('completa')) return 'Pensión Completa';
    if (p.includes('incluido')) return 'Todo Incluido';
    return 'Sin Pensión';
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

        const tarjetasAbiertas = this.reservas.filter(r => r.expanded).map(r => r.id);
        const ticketsAbiertos = this.reservas.filter(r => r.showBreakdown).map(r => r.id);

        this.reservas = filteredList.map(r => {
          const salida = new Date(r.fechaSalida);
          const esAntigua = salida < hoy;

          let estadoVisual = r.estado || r.status || 'Pendiente';
          if (estadoVisual === 'Confirmada' && esAntigua) estadoVisual = 'Completada';

          const paxAllergiesText = r.passengers?.find((p:any) => p.allergies && p.allergies.trim() !== '' && p.allergies.toLowerCase() !== 'ninguna')?.allergies;
          const isAllergic = !!((r.notas && r.notas !== '' && r.notas.toLowerCase() !== 'ninguna') || paxAllergiesText);

          const fixedPension = this.normalizePensionName(r.pension || r.selectedPension?.name);

          return {
            ...r,
            numero: String(r.id ?? r.numero ?? ''),
            status: estadoVisual,
            titular: r.nombreCliente ?? r.titular ?? '-',
            habitacion: r.habitacion ?? 'Sin asignar',
            ninos: Number(r.children ?? r.ninos ?? 0),
            adultos: Number(r.adults ?? r.adultos ?? 1),
            precioTotal: Number(r.total ?? r.precioTotal ?? 0),
            pension: fixedPension,
            numeroHabitaciones: Number(r.habitaciones ?? r.numeroHabitaciones ?? 1),
            hasAllergies: isAllergic,
            alergias: r.notas || paxAllergiesText || '',
            mascota: r.mascota ?? r.pets ?? false,
            passengers: r.passengers || [],
            expanded: tarjetasAbiertas.includes(r.id),
            showBreakdown: ticketsAbiertos.includes(r.id)
          };
        });

        this.reservas.sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando reservas:', err)
    });
  }

  // === MÉTODOS DE FILTRADO ===
  setFilter(filter: string) {
    this.statusFilter = filter;
    this.reservas.forEach(x => {
      x.expanded = false;
      x.showBreakdown = false; 
    });
  }

  get filteredReservas(): any[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let pool = this.reservas;
    const role = this.auth.getRole();

    if (role === 'restaurante') {
      pool = pool.filter(r => (r.status === 'Confirmada' || r.status === 'Completada') && r.hasAllergies);
    }

    const results = pool.filter(r => {
      if (this.statusFilter === 'Todos') {
        if (r.status === 'Completada') return false; 
      } else {
        if (r.status !== this.statusFilter) return false;
      }
      
      if (!term) return true;
      const inTitular = String(r.titular ?? '').toLowerCase().includes(term);
      const inNumero = String(r.numero ?? '').toLowerCase().includes(term);
      return inTitular || inNumero;
    });

    return results;
  }

  // === MOTOR DE SINCRONIZACIÓN INFALIBLE ===
  sincronizarAsignaciones(habAntiguas: string, habNuevas: string, estadoReserva: string) {
    
  }

  calculateBreakdown(r: any) {
    const ci = new Date(r.fechaEntrada);
    const co = new Date(r.fechaSalida);
    let nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000);
    if (isNaN(nights) || nights <= 0) nights = 1;

    const guests = r.adultos + r.ninos;
    const pensionPxN = this.pensionPrices[r.pension] || 0;
    const pensionTotal = pensionPxN * guests * nights;

    let roomTotal = 0;
    const roomsInfo: any[] = [];
    let totalHabsWeb = 0;

    if (r.selectedCategories && r.selectedCategories.length > 0) {
      r.selectedCategories.forEach((cat: any) => {
        const t = (Number(cat.price) || 0) * (Number(cat.qty) || 1) * nights;
        roomTotal += t;
        roomsInfo.push({ name: cat.name || cat.nombre, qty: Number(cat.qty) || 1, price: Number(cat.price) || 0, total: t });
        totalHabsWeb += (Number(cat.qty) || 1);
      });
    }

    const stringHabs = r.habitacion || '';
    const arrayHabs = stringHabs.split(',').map((h: string) => h.trim()).filter((h: string) => h !== '' && h !== 'Sin asignar');
    const manualHabs = arrayHabs.slice(totalHabsWeb);

    manualHabs.forEach((numHab: string) => {
      const roomDb = this.habitacionesFisicasCache.find(x => String(x.numero) === String(numHab));
      const rp = roomDb ? Number(roomDb.precio || roomDb.price || 0) : 0;
      roomTotal += (rp * nights);
      roomsInfo.push({ name: `Hab. ${numHab} (${roomDb?.tipo || 'Extra'})`, qty: 1, price: rp, total: rp * nights });
    });

    if (roomTotal === 0 && r.precioTotal > pensionTotal) {
       roomTotal = r.precioTotal - pensionTotal;
       roomsInfo.push({ name: `Tarifa Base Manual`, qty: 1, price: roomTotal / nights, total: roomTotal });
    }

    return { nights, guests, pensionName: r.pension, pensionPxN, pensionTotal, roomsInfo, mathTotal: roomTotal + pensionTotal };
  }

  // === MAGIA NUEVA: GENERADOR DE TICKET / FACTURA PDF ===
  async generarTicketPDF(r: any, ev?: Event) {
    if (ev) ev.stopPropagation();

    const loading = await this.loadingCtrl.create({ message: 'Generando ticket...', spinner: 'crescent' });
    await loading.present();

    try {
      const bd = this.calculateBreakdown(r);
      const titularObj = r.passengers?.find((p:any) => p.isPrimary) || r.passengers?.[0] || {};
      const titularDNI = titularObj.dni || 'No especificado';
      const titularTel = titularObj.phone || r.telefono || 'No especificado';
      const isMascota = r.mascota === true || r.mascota === 'true' || r.mascota === 'Si' ? 'Sí' : 'No';

      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.top = '-9999px';
      element.style.left = '-9999px';
      element.style.width = '800px'; 
      element.style.background = '#ffffff';
      element.style.padding = '50px';
      element.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
      element.style.color = '#333';

      let tablaHabitaciones = '';
      bd.roomsInfo.forEach((room: any) => {
        tablaHabitaciones += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${room.qty}x ${room.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${bd.nights}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${this.formatCurrency(room.price)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${this.formatCurrency(room.total)}</td>
          </tr>
        `;
      });

      element.innerHTML = `
        <div style="border: 1px solid #ccc; padding: 40px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 1px;">SUPER HOTEL</h1>
              <p style="margin: 5px 0 0; font-size: 14px; color: #555;">Av. Principal, 123 - Ciudad</p>
              <p style="margin: 2px 0 0; font-size: 14px; color: #555;">CIF: B-12345678 | Tel: 900 123 456</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 24px; color: #222; text-transform: uppercase;">Ticket de Reserva</h2>
              <p style="margin: 5px 0 0; font-size: 16px;"><strong>Localizador:</strong> ${r.numero}</p>
              <p style="margin: 2px 0 0; font-size: 14px; color: #555;">Fecha de emisión: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 6px;">
            <div style="width: 48%;">
              <h3 style="margin: 0 0 10px; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">DATOS DEL CLIENTE</h3>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Titular:</strong> ${r.titular}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>DNI/Pasaporte:</strong> ${titularDNI}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Teléfono:</strong> ${titularTel}</p>
            </div>
            <div style="width: 48%;">
              <h3 style="margin: 0 0 10px; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">DATOS DE ESTANCIA</h3>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Fecha Entrada:</strong> ${this.formatDate(r.fechaEntrada)}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Fecha Salida:</strong> ${this.formatDate(r.fechaSalida)} (${bd.nights} noches)</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Ocupantes:</strong> ${r.adultos} Adultos, ${r.ninos} Niños</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Mascota:</strong> ${isMascota}</p>
            </div>
          </div>

          <h3 style="margin: 0 0 15px; font-size: 18px;">DESGLOSE DE SERVICIOS</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 15px;">
            <thead>
              <tr style="background-color: #222; color: #fff;">
                <th style="padding: 12px; text-align: left;">Concepto</th>
                <th style="padding: 12px; text-align: center;">Noches / Pax</th>
                <th style="padding: 12px; text-align: right;">Precio Ud.</th>
                <th style="padding: 12px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${tablaHabitaciones}
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #ddd;">Suplemento: ${bd.pensionName}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${bd.guests} pax</td>
                <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${this.formatCurrency(bd.pensionPxN)}/noche</td>
                <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${this.formatCurrency(bd.pensionTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
            <div style="width: 300px; background: #f4f5f8; padding: 20px; border-radius: 6px; text-align: right;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #555;">IVA y Tasas (10% incl.)</p>
              <h2 style="margin: 0; font-size: 28px; color: #222;">TOTAL: ${this.formatCurrency(bd.mathTotal)}</h2>
            </div>
          </div>

          ${r.alergias ? `
            <div style="margin-bottom: 30px; padding: 15px; border-left: 4px solid #b91c1c; background: #fff5f5;">
              <h4 style="margin: 0 0 5px; color: #b91c1c; font-size: 15px;">Notas Importantes / Alergias:</h4>
              <p style="margin: 0; font-size: 14px; color: #333;">${r.alergias}</p>
            </div>
          ` : ''}

          <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: center; width: 250px;">
              <hr style="border: none; border-top: 1px solid #333; margin-bottom: 10px;">
              <p style="margin: 0; font-size: 14px; color: #555;">Firma del Cliente</p>
            </div>
            <div style="text-align: right; color: #777; font-size: 12px;">
              Documento generado por el sistema de recepción.<br>
              ¡Gracias por confiar en Super Hotel!
            </div>
          </div>

        </div>
      `;

      document.body.appendChild(element);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      
      const fileName = `Ticket_${r.numero || 'Reserva'}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
        await Share.share({ title: 'Ticket de Reserva', url: savedFile.uri });
      } else {
        pdf.save(fileName);
      }

      document.body.removeChild(element);
      await loading.dismiss();

    } catch (error) {
      console.error('Error generando Ticket PDF', error);
      await loading.dismiss();
      const alert = await this.alertCtrl.create({ header: 'Error', message: 'No se pudo generar el ticket.', buttons: ['OK'] });
      await alert.present();
    }
  }

  // ==========================================

  async openNewReservation() {
    if (this.auth.getRole() === 'restaurante') return; 
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent
    });
    modal.onDidDismiss().then((res) => {
      if (res.data?.reserva) {
        this.api.guardarReserva(res.data.reserva).subscribe(() => {
           this.sincronizarAsignaciones('', res.data.reserva.habitacion, res.data.reserva.estado);
           this.cargarDatos();
        });
      }
    });
    return await modal.present();
  }

  async openEditReservation(r: any) {
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent,
      componentProps: { initial: r }
    });
    
    modal.onDidDismiss().then((res) => {
      if (res.data?.reserva) {
        const payload = res.data.reserva;
        payload.pension = this.normalizePensionName(payload.pension);
        const habAntiguas = r.habitacion; 

        this.api.editarReserva(r.id, payload).subscribe({
           next: () => {
             this.sincronizarAsignaciones(habAntiguas, payload.habitacion, payload.estado);
             this.showToast('Reserva actualizada', 'success');
             this.cargarDatos(); 
           },
           error: () => this.cargarDatos()
        });
      }
    });
    return await modal.present();
  }

  async confirmReservation(r: any) {
    if (r.status === 'Pendiente') {
      this.openEditReservation(r);
    } else {
      this.api.updateReserva(r.id, { estado: 'Confirmada' }).subscribe(() => {
        this.sincronizarAsignaciones('', r.habitacion, 'Confirmada'); 
        this.showToast('Reserva confirmada', 'success');
        this.cargarDatos();
      });
    }
  }

  denyReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Denegada' }).subscribe(() => {
      this.sincronizarAsignaciones(r.habitacion, '', 'Denegada'); 
      this.showToast('Reserva denegada', 'warning');
      this.cargarDatos();
    });
  }

  cancelByClient(r: any) {
    this.api.updateReserva(r.id, { estado: 'Cancelada' }).subscribe(() => {
      this.sincronizarAsignaciones(r.habitacion, '', 'Cancelada'); 
      this.showToast('Reserva cancelada', 'warning');
      this.cargarDatos();
    });
  }

  reactivateReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Confirmada' }).subscribe(() => {
      this.sincronizarAsignaciones('', r.habitacion, 'Confirmada'); 
      this.showToast('Reserva reactivada', 'success');
      this.cargarDatos();
    });
  }

  async confirmDeleteReservation(r: any) {
    this.showCustomConfirm(r);
  }

  deleteReservation(r: any) {
    this.api.eliminarReserva(r.id).subscribe(() => {
      this.sincronizarAsignaciones(r.habitacion, '', 'Borrada'); 
      this.showToast('Registro eliminado', 'dark');
      this.cargarDatos();
    });
  }

  showCustomConfirm(r: any) {
    (async () => {
      const alert = await this.alertCtrl.create({
        header: 'Confirmar borrado',
        message: `¿Borrar registro de la reserva ${r.numero}? Esta acción no se puede deshacer.`,
        cssClass: 'custom-delete-alert',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'btn-cancel-green' },
          { text: 'Borrar', cssClass: 'btn-confirm-green', handler: () => { this.deleteReservation(r); } }
        ]
      });
      await alert.present();
    })();
  }

  toggleExpand(r: any) {
    this.reservas.forEach(x => { if (x !== r) { x.expanded = false; x.showBreakdown = false; } });
    r.expanded = !r.expanded;
  }

  toggleBreakdown(r: any, ev: Event) {
    ev.stopPropagation(); 
    r.showBreakdown = !r.showBreakdown;
    if (r.showBreakdown) r.breakdownData = this.calculateBreakdown(r);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  }

  formatCurrency(v?: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);
  }

  formatHabitacionesInfo(habString: string): string {
    if (!habString || habString.trim() === '' || habString === 'Sin asignar') return 'Sin asignar';
    if (!this.habitacionesFisicasCache || this.habitacionesFisicasCache.length === 0) return habString; 

    const nums = habString.split(',').map(h => h.trim()).filter(h => h !== '');
    const mapeadas = nums.map(num => {
      const roomDb = this.habitacionesFisicasCache.find(x => String(x.numero) === String(num));
      return roomDb && roomDb.tipo ? `Nº ${num} (${roomDb.tipo})` : `Nº ${num}`;
    });

    return mapeadas.join(', ');
  }

  async showToast(msg: string, color: string = 'dark') {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color });
    t.present();
  }

  onSearch(ev: any) { this.searchTerm = ev?.detail?.value ?? ''; }
  onContentScroll(ev: any) { this.showScrollTop = (ev?.detail?.scrollTop ?? 0) > 200; }
  scrollToTop() { this.content.scrollToTop(400); }
}