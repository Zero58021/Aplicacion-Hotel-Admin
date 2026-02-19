import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, IonContent, AlertController, ToastController } from '@ionic/angular'; // <-- AÑADIDO ToastController
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth.service';


export interface Employee {
  id?: any;
  numero: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  photo?: string;
  puesto: string;
  status: string;
  contrato: string;
  salario?: number; 
  usuario?: string; 
  password?: string; 
  rol?: string; 
}

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

  // Datos Financieros Reales
  totalIngresos: number = 0;
  totalGastos: number = 0;
  beneficioNeto: number = 0;

  // Variables para la animación visual (AÑADE ESTAS 3)
  displayIngresos: number = 0;
  displayGastos: number = 0;
  displayBeneficio: number = 0;

  employees: Employee[] = [];
  searchText: string = '';

  // Variables para Preview
  previewVisible: boolean = false;
  previewImage: string | null = null;
  currentPreviewEmployee: Employee | null = null;

  // NUEVO: Variables para el Modal Premium
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  editingEmployee: Partial<Employee> = {};

  constructor(
    private alertController: AlertController,
    private api: ApiService,
    public auth: AuthService,
    private toastCtrl: ToastController // <-- AÑADIDO ToastController (named toastCtrl to match usages)
  ) { }

  ngOnInit() { this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  loadData() {
    this.api.getEmpleados().subscribe(data => {
      this.employees = data;
      this.calculateFinancials();
    });

    this.api.getReservas().subscribe(data => {
      const confirmadas = data.filter(r => r.estado === 'Confirmada' || r.status === 'Confirmada');
      this.totalIngresos = confirmadas.reduce((acc, r) => acc + (Number(r.total) || Number(r.precioTotal) || 0), 0);
      this.calculateFinancials();
    });
  }

  calculateFinancials() {
    this.totalGastos = this.employees.reduce((acc, e) => acc + (Number(e.salario) || 0), 0);
    this.beneficioNeto = this.totalIngresos - this.totalGastos;

    // Lanzar la animación (1500 milisegundos = 1.5 segundos)
    this.animateValue(this.totalIngresos, 'displayIngresos', 1500);
    this.animateValue(this.totalGastos, 'displayGastos', 1500);
    this.animateValue(this.beneficioNeto, 'displayBeneficio', 1500);
  }

  // --- FUNCIÓN DE ANIMACIÓN "DE LOKOS" ---
  animateValue(target: number, prop: 'displayIngresos' | 'displayGastos' | 'displayBeneficio', duration: number) {
    const start = 0;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Efecto de frenado suave al llegar al final (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 4); 
      
      this[prop] = start + (target - start) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this[prop] = target; // Clava el número exacto al final
      }
    };
    requestAnimationFrame(step);
  }

  get employeesToShow(): Employee[] {
    const q = (this.searchText || '').toLowerCase().trim();
    if (!q) return this.employees;
    return this.employees.filter(e => {
      const numero = (e.numero || '').toLowerCase();
      const fullName = ((e.nombre || '') + ' ' + (e.apellidos || '')).toLowerCase();
      return numero.includes(q) || fullName.includes(q);
    });
  }

  onSearch(ev: any) { this.searchText = ev?.detail?.value ?? ev?.target?.value ?? ''; }

  // --- NUEVO CRUD CON MODAL ---

  addEmployee() {
    this.isEditMode = false;

    // --- LÓGICA DE AUTO-NUMERACIÓN ---
    let nextNum = 1;
    if (this.employees.length > 0) {
      // Extraemos los números de todos los empleados (ej: "EMP-005" -> 5)
      const numeros = this.employees.map(e => {
        const parts = (e.numero || '').split('-');
        return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
      });
      // Buscamos el mayor y le sumamos 1
      nextNum = Math.max(...numeros) + 1;
    }
    // Formateamos para que siempre tenga 3 cifras (EMP-001, EMP-015...)
    const autoNum = `${nextNum.toString()}`;

    this.editingEmployee = {
      numero: autoNum,
      status: 'Activo',
      puesto: 'Recepción',
      contrato: 'Indefinido'
    };
    this.isModalOpen = true;
  }

  editEmployee(emp: Employee) {
    this.isEditMode = true;
    this.editingEmployee = { ...emp };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveEmployee() {
    const emp = this.editingEmployee as any;

    // 1. Recopilar qué campos exactos faltan
    const camposFaltantes = [];
    if (!emp.nombre) camposFaltantes.push('Nombre');
    if (!emp.apellidos) camposFaltantes.push('Apellidos');
    if (!emp.dni) camposFaltantes.push('DNI');
    if (!emp.telefono) camposFaltantes.push('Teléfono');
    if (!emp.email) camposFaltantes.push('Email');
    if (emp.salario === undefined || emp.salario === null || emp.salario === '') camposFaltantes.push('Salario');
    if (!emp.contrato) camposFaltantes.push('Contrato');
    if (!emp.password) camposFaltantes.push('Contraseña');

    if (camposFaltantes.length > 0) {
      const mensaje = camposFaltantes.length === 1 
        ? `Te falta rellenar: ${camposFaltantes[0]}` 
        : `Te faltan estos campos: ${camposFaltantes.join(', ')}`;
      this.showError(mensaje);
      return;
    }

    // 2. VALIDAR DUPLICADOS (¡La nueva magia!)
    // Buscamos si en la lista actual de empleados ya hay alguien con esos datos
    // y nos aseguramos de que no sea la misma persona que estamos editando (e.id !== emp.id)
    const duplicadoDNI = this.employees.find(e => e.dni?.toUpperCase() === emp.dni.toUpperCase() && e.id !== emp.id);
    const duplicadoEmail = this.employees.find(e => e.email?.toLowerCase() === emp.email.toLowerCase() && e.id !== emp.id);
    const duplicadoTelefono = this.employees.find(e => e.telefono === emp.telefono && e.id !== emp.id);
    const duplicadoNumero = this.employees.find(e => e.numero === emp.numero && e.id !== emp.id);

    if (duplicadoDNI) {
      this.showError('Ya existe un empleado registrado con este DNI.');
      return;
    }
    if (duplicadoEmail) {
      this.showError('Ya existe un empleado registrado con este Email.');
      return;
    }
    if (duplicadoTelefono) {
      this.showError('Ya existe un empleado con este número de Teléfono.');
      return;
    }
    if (duplicadoNumero) {
      this.showError('Ya existe un empleado con este Nº de Empleado.');
      return;
    }

    // 3. Validar formato de Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emp.email)) {
      this.showError('El formato del correo electrónico no es válido.');
      return;
    }

    // 4. Validar Teléfono (Acepta 9 dígitos, ignorando espacios)
    const phoneRegex = /^[0-9]{9}$/;
    const telefonoLimpio = emp.telefono.toString().replace(/\s/g, ''); 
    if (!phoneRegex.test(telefonoLimpio)) {
      this.showError('El teléfono debe tener exactamente 9 dígitos.');
      return;
    }

    // 5. Validar DNI / NIE (Formato visual)
    if (!this.validarDNI(emp.dni)) {
      this.showError('El DNI debe tener 8 números y 1 letra (ej: 12345678A).');
      return;
    }

    // Asignar el rol lógico para la API
    emp.rol = emp.puesto?.toLowerCase().split(' ')[0] || 'recepción';

    // Guardar
    if (this.isEditMode && emp.id) {
      this.api.editarEmpleado(emp.id, emp).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.showSuccess('Empleado actualizado con éxito');
      });
    } else {
      this.api.guardarEmpleado(emp).subscribe(() => {
        this.loadData();
        this.closeModal();
        setTimeout(() => this.scrollToBottom(), 200);
        this.showSuccess('Empleado creado con éxito');
      });
    }
  }

  // --- FUNCIONES DE VALIDACIÓN Y AVISOS ---

  // Validador matemático de DNI y NIE Español
  // Validador de formato DNI/NIE (Permite inventados, ignora la matemática)
  validarDNI(dni: string): boolean {
    const str = dni.toString().toUpperCase().trim();
    
    // Solo comprobamos que tenga el formato visual: 
    // 8 números + 1 letra (NIF) o X/Y/Z + 7 números + 1 letra (NIE)
    const nifRexp = /^[0-9]{8}[A-Z]$/i;
    const nieRexp = /^[XYZ][0-9]{7}[A-Z]$/i;

    // Si cumple la "apariencia", lo damos por bueno sin calcular la letra
    return nifRexp.test(str) || nieRexp.test(str);
  }

  // Notificación de error visual
  async showError(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3500,
      color: 'danger',
      position: 'top',
      icon: 'warning-outline'
    });
    toast.present();
  }

  // Notificación de éxito visual
  async showSuccess(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    toast.present();
  }

  // --- RESTO DE FUNCIONES (Estado, Eliminar, Fotos) ---

  async changeStatus(emp: Employee) {
    const alert = await this.alertController.create({
      header: 'Cambiar estado',
      inputs: [
        { name: 'status', type: 'radio', label: 'Activo', value: 'Activo', checked: emp.status === 'Activo' },
        { name: 'status', type: 'radio', label: 'Baja', value: 'Baja', checked: emp.status === 'Baja' },
        { name: 'status', type: 'radio', label: 'En licencia', value: 'En licencia', checked: emp.status === 'En licencia' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (val) => {
            if (val) this.api.editarEmpleado(emp.id, { ...emp, status: val }).subscribe(() => this.loadData());
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDelete(emp: Employee) {
    const alert = await this.alertController.create({
      header: 'Eliminar',
      message: `¿Eliminar a ${emp.nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', handler: () => { this.api.eliminarEmpleado(emp.id).subscribe(() => this.loadData()); } }
      ]
    });
    await alert.present();
  }

  onAvatarClick(emp: Employee, photo?: string) {
    if (photo) {
      this.currentPreviewEmployee = emp;
      this.openPreview(photo);
    } else {
      const idx = this.employeesToShow.indexOf(emp);
      if (idx >= 0) {
        const input = document.getElementById(`file-${idx}`) as HTMLInputElement;
        input?.click();
      }
    }
  }

  fileChanged(ev: Event, emp: any) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

        this.api.editarEmpleado(emp.id, { ...emp, photo: dataUrl }).subscribe(() => this.loadData());
      };
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // Adaptado para el nuevo Modal
  fileChangedModal(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

        this.editingEmployee.photo = dataUrl; // Se actualiza directo en el objeto temporal
        input.value = '';
      };
    };
    reader.readAsDataURL(file);
  }

  triggerModalFileInput() {
    this.closePreview();
    const input = document.getElementById('file-modal') as HTMLInputElement;
    input?.click();
  }

  openPreview(photo: string) {
    this.previewImage = photo;
    this.previewVisible = true;
  }
  closePreview() {
    this.previewVisible = false;
    this.previewImage = null;
    this.currentPreviewEmployee = null;
  }

  formatCurrency(value: number | undefined) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
  }

  scrollToBottom() { this.content?.scrollToBottom(300); }
  onContentScroll(ev: any) { this.showScrollTop = (ev?.detail?.scrollTop ?? 0) > 200; }
  scrollToTop() { this.content?.scrollToTop(300); }
}