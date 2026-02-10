  import { Component, OnInit, ViewChild } from '@angular/core';
  import { IonicModule, IonContent, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { Employee } from '../models/employee.model';

@Component({
  selector: 'app-tab5',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ExploreContainerComponentModule],
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {

  @ViewChild(IonContent, { static: false }) content: IonContent | undefined;
  showScrollTop: boolean = false;

  constructor(private alertController: AlertController) { }

  // store original back-button icons/handlers to restore on leave
  private _backButtonOriginals = new Map<HTMLElement, { icon: string | null, clickHandler?: any }>();

  // used by add/edit dialogs to hold a photo selected while the alert is open
  modalEditingIndex: number | 'new' | null = null;
  pendingModalPhotoData: string | null = null;
  // preview state
  previewVisible: boolean = false;
  previewImage: string | null = null;
  previewIndex: number | null = null;

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.replaceBackButtonWithSearch();
  }

  ionViewWillLeave() {
    this.restoreBackButton();
  }

  private replaceBackButtonWithSearch() {
    const buttons = Array.from(document.querySelectorAll('ion-back-button')) as HTMLElement[];
    buttons.forEach(btn => {
      try {
        const origIcon = btn.getAttribute('icon');
        const origClick = (btn as any).__searchFocusHandler;
        this._backButtonOriginals.set(btn, { icon: origIcon, clickHandler: origClick });
        btn.setAttribute('icon', 'search');
        // replace click to focus the page searchbar
        const handler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          const sb = document.querySelector('ion-searchbar');
          if (sb && (sb as any).setFocus) (sb as any).setFocus();
        };
        // save and attach
        (btn as any).__searchFocusHandler = handler;
        btn.addEventListener('click', handler);
      } catch (err) {
        // ignore
      }
    });
  }

  private restoreBackButton() {
    this._backButtonOriginals.forEach((orig, btn) => {
      try {
        if (orig.icon == null) btn.removeAttribute('icon'); else btn.setAttribute('icon', orig.icon);
        const handler = (btn as any).__searchFocusHandler;
        if (handler) {
          btn.removeEventListener('click', handler);
          delete (btn as any).__searchFocusHandler;
        }
      } catch (err) { }
    });
    this._backButtonOriginals.clear();
  }

  pickImage(index: number) {
    if (index < 0 || index >= this.employees.length) return;
    const input = document.getElementById(`file-${index}`) as HTMLInputElement | null;
    input?.click();
  }

  onAvatarClick(index: number, photo?: string) {
    if (photo) {
      this.openPreview(index, photo);
    } else {
      this.pickImage(index);
    }
  }

  openPreview(index: number, photo: string) {
    this.previewIndex = index;
    this.previewImage = photo;
    this.previewVisible = true;
  }

  closePreview() {
    this.previewVisible = false;
    this.previewImage = null;
    this.previewIndex = null;
  }

  fileChanged(ev: Event, index: number) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string | null;
      if (dataUrl) this.employees[index].photo = dataUrl;
    };
    reader.readAsDataURL(file);
    // reset input so selecting same file later still triggers change
    input.value = '';
  }

  fileChangedModal(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string | null;
      if (dataUrl) {
        this.pendingModalPhotoData = dataUrl;
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  triggerModalFileInput(index: number | null) {
    if (index === null || index === undefined) return;
    const id = `file-${index}`;
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.click();
  }

  employees: Employee[] = [
    { numero: '001', nombre: 'Ana', apellidos: 'García', dni: '12345678A', telefono: '600111222', email: 'ana@example.com', photo: 'https://i.pravatar.cc/150?img=1', puesto: 'Limpieza', status: 'Activo', contrato: 'Indefinido' },
    { numero: '002', nombre: 'Luis', apellidos: 'Martínez', dni: '87654321B', telefono: '600333444', email: 'luis@example.com', photo: 'https://i.pravatar.cc/150?img=2', puesto: 'Restaurante', status: 'Activo', contrato: 'Indefinido' },
    { numero: '003', nombre: 'Marta', apellidos: 'Pérez', dni: '11223344C', telefono: '600555666', email: 'marta@example.com', photo: 'https://i.pravatar.cc/150?img=3', puesto: 'Mostrador', status: 'Activo', contrato: 'A tiempo completo' },
    { numero: '004', nombre: 'Javier', apellidos: 'Ruiz', dni: '22113344D', telefono: '600777888', email: 'javier.ruiz@example.com', puesto: 'Limpieza', status: 'Activo', contrato: 'Temporal' },
    { numero: '005', nombre: 'Carmen', apellidos: 'López', dni: '33445566E', telefono: '600888999', email: 'carmen.lopez@example.com', puesto: 'Restaurante', status: 'Activo', contrato: 'A tiempo parcial' },
    { numero: '006', nombre: 'Pedro', apellidos: 'Sánchez', dni: '44556677F', telefono: '600123987', email: 'pedro.sanchez@example.com', puesto: 'Mostrador', status: 'Activo', contrato: 'Indefinido' },
    { numero: '007', nombre: 'Laura', apellidos: 'Gómez', dni: '55667788G', telefono: '600222333', email: 'laura.gomez@example.com', puesto: 'Limpieza', status: 'Activo', contrato: 'Indefinido' },
    { numero: '008', nombre: 'Sergio', apellidos: 'Díaz', dni: '66778899H', telefono: '600444555', email: 'sergio.diaz@example.com', puesto: 'Restaurante', status: 'Activo', contrato: 'Por obra o servicio' },
    { numero: '009', nombre: 'Elena', apellidos: 'Torres', dni: '77889900J', telefono: '600666777', email: 'elena.torres@example.com', puesto: 'Mostrador', status: 'Activo', contrato: 'Indefinido' },
    { numero: '010', nombre: 'Roberto', apellidos: 'Jiménez', dni: '88990011K', telefono: '600999000', email: 'roberto.jimenez@example.com', puesto: 'Limpieza', status: 'Activo', contrato: 'Temporal' },
    { numero: '011', nombre: 'Silvia', apellidos: 'Morales', dni: '99001122L', telefono: '600101010', email: 'silvia.morales@example.com', puesto: 'Restaurante', status: 'Activo', contrato: 'A tiempo completo' },
    { numero: '012', nombre: 'Andrés', apellidos: 'Herrera', dni: '10111213M', telefono: '600202020', email: 'andres.herrera@example.com', puesto: 'Mostrador', status: 'Activo', contrato: 'Indefinido' },
    { numero: '013', nombre: 'Natalia', apellidos: 'Vega', dni: '12131415N', telefono: '600303030', email: 'natalia.vega@example.com', puesto: 'Restaurante', status: 'Activo', contrato: 'A tiempo completo' }
  ];

  // búsqueda
  searchText: string = '';

  get employeesToShow(): Employee[] {
    const q = (this.searchText || '').toLowerCase().trim();
    if (!q) return this.employees;
    return this.employees.filter(e => {
      const numero = (e.numero || '').toLowerCase();
      const fullName = ((e.nombre || '') + ' ' + (e.apellidos || '')).toLowerCase();
      return numero.includes(q) || fullName.includes(q);
    });
  }

  onSearch(ev: any) {
    this.searchText = ev?.detail?.value ?? ev?.target?.value ?? '';
  }

  async addEmployee() {
    // prepare modal state for new employee
    this.modalEditingIndex = 'new';
    this.pendingModalPhotoData = null;

    const alert = await this.alertController.create({
      header: 'Nuevo empleado',
      inputs: [
        { name: 'numero', type: 'text', placeholder: 'Número de empleado' },
        { name: 'nombre', type: 'text', placeholder: 'Nombre' },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos' },
        { name: 'dni', type: 'text', placeholder: 'DNI' },
        { name: 'telefono', type: 'tel', placeholder: 'Teléfono' },
        { name: 'email', type: 'email', placeholder: 'Correo electrónico' },
        { name: 'photo', type: 'text', placeholder: 'URL foto (opcional)' },
        { name: 'puesto', type: 'text', placeholder: 'Puesto (limpieza, restaurante, mostrador)' },
        { name: 'contrato', type: 'text', placeholder: 'Contrato (Indefinido, Temporal, Por obra o servicio, A tiempo completo, A tiempo parcial)', value: 'Indefinido' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Elegir foto',
          handler: () => {
            this.modalEditingIndex = 'new';
            const input = document.getElementById('file-modal') as HTMLInputElement | null;
            input?.click();
            return false; // keep the alert open
          }
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (!data || !data.nombre) return;
            const emp: Employee = {
              numero: data.numero || '',
              nombre: data.nombre || '',
              apellidos: data.apellidos || '',
              dni: data.dni || '',
              telefono: data.telefono || '',
              email: data.email || '',
              photo: this.pendingModalPhotoData || data.photo || undefined,
              puesto: data.puesto || '',
              status: data.status || 'Activo',
              contrato: data.contrato || 'Indefinido'
            };
            this.employees.push(emp);
            this.pendingModalPhotoData = null;
            this.modalEditingIndex = null;
            setTimeout(() => this.scrollToBottom(), 200);
          }
        }
      ]
    });

    await alert.present();
  }

  async editEmployee(index: number) {
    if (index < 0 || index >= this.employees.length) return;
    const emp = this.employees[index];
    // prepare modal state for editing
    this.modalEditingIndex = index;
    this.pendingModalPhotoData = null;
    const alert = await this.alertController.create({
      header: 'Editar empleado',
      inputs: [
        { name: 'numero', type: 'text', placeholder: 'Número de empleado', value: emp.numero },
        { name: 'nombre', type: 'text', placeholder: 'Nombre', value: emp.nombre },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos', value: emp.apellidos },
        { name: 'dni', type: 'text', placeholder: 'DNI', value: emp.dni },
        { name: 'telefono', type: 'tel', placeholder: 'Teléfono', value: emp.telefono },
        { name: 'email', type: 'email', placeholder: 'Correo electrónico', value: emp.email },
        { name: 'photo', type: 'text', placeholder: 'URL foto (opcional)', value: (emp as any).photo || '' },
        { name: 'puesto', type: 'text', placeholder: 'Puesto (limpieza, restaurante, mostrador)', value: emp.puesto },
        { name: 'contrato', type: 'text', placeholder: 'Contrato (Indefinido, Temporal, Por obra o servicio, A tiempo completo, A tiempo parcial)', value: emp.contrato }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Elegir foto',
          handler: () => {
            this.modalEditingIndex = index;
            const input = document.getElementById('file-modal') as HTMLInputElement | null;
            input?.click();
            return false; // keep the alert open
          }
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (!data || !data.nombre) return;
            const updated: Employee = {
              numero: data.numero || '',
              nombre: data.nombre || '',
              apellidos: data.apellidos || '',
              dni: data.dni || '',
              telefono: data.telefono || '',
              email: data.email || '',
              photo: this.pendingModalPhotoData || data.photo || emp.photo,
              puesto: data.puesto || '',
              status: emp.status || 'Activo',
              contrato: data.contrato || emp.contrato || 'Indefinido'
            };
            this.employees[index] = updated;
            this.pendingModalPhotoData = null;
            this.modalEditingIndex = null;
          }
        }
      ]
    });

    await alert.present();
  }

  async changeStatus(index: number) {
    if (index < 0 || index >= this.employees.length) return;
    const emp = this.employees[index];
    const alert = await this.alertController.create({
      header: 'Cambiar estado',
      inputs: [
        { name: 'status', type: 'radio', label: 'Activo', value: 'Activo', checked: emp.status === 'Activo' },
        { name: 'status', type: 'radio', label: 'Baja', value: 'Baja', checked: emp.status === 'Baja' },
        { name: 'status', type: 'radio', label: 'En licencia', value: 'En licencia', checked: emp.status === 'En licencia' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', handler: (data) => {
            if (!data) return;
            this.employees[index].status = data;
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDelete(index: number) {
    const alert = await this.alertController.create({
      header: 'Eliminar',
      message: '¿Eliminar este empleado? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', handler: () => this.deleteEmployee(index) }
      ]
    });
    await alert.present();
  }

  deleteEmployee(index: number) {
    if (index >= 0 && index < this.employees.length) {
      this.employees.splice(index, 1);
    }
  }

  private scrollToBottom() {
    this.content?.scrollToBottom(300);
  }

  onContentScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    this.showScrollTop = y > 200;
  }

  scrollToTop() {
    this.content?.scrollToTop(300);
  }

}
