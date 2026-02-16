import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, IonContent, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth.service';

// Definimos la interfaz aquí para evitar errores si no tienes el modelo creado
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
  salario?: number; // Nuevo campo
  usuario?: string; // Para login
  password?: string; // Para login
  rol?: string; // Para login
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

  // Datos Financieros
  totalIngresos: number = 0;
  totalGastos: number = 0;
  beneficioNeto: number = 0;

  // Datos Empleados
  employees: Employee[] = [];
  searchText: string = '';

  // Variables para gestión de fotos
  modalEditingId: any = null;
  pendingModalPhotoData: string | null = null;
  
  // Variables para Preview
  previewVisible: boolean = false;
  previewImage: string | null = null;
  currentPreviewEmployee: Employee | null = null;

  constructor(
    private alertController: AlertController,
    private api: ApiService,
    public auth: AuthService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    // 1. Cargar Empleados (y calcular gastos)
    this.api.getEmpleados().subscribe(data => {
      this.employees = data;
      this.calculateFinancials();
    });

    // 2. Cargar Reservas (y calcular ingresos)
    this.api.getReservas().subscribe(data => {
      // Solo sumamos reservas confirmadas
      const confirmadas = data.filter(r => r.estado === 'Confirmada' || r.status === 'Confirmada');
      this.totalIngresos = confirmadas.reduce((acc, r) => acc + (Number(r.total) || Number(r.precioTotal) || 0), 0);
      this.calculateFinancials();
    });
  }

  calculateFinancials() {
    this.totalGastos = this.employees.reduce((acc, e) => acc + (Number(e.salario) || 0), 0);
    this.beneficioNeto = this.totalIngresos - this.totalGastos;
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

  onSearch(ev: any) {
    this.searchText = ev?.detail?.value ?? ev?.target?.value ?? '';
  }

  // --- CRUD EMPLEADOS CONECTADO A API ---

  async addEmployee() {
    this.modalEditingId = 'new';
    this.pendingModalPhotoData = null;

    const alert = await this.alertController.create({
      header: 'Nuevo empleado',
      cssClass: 'custom-alert',
      inputs: [
        { name: 'numero', type: 'text', placeholder: 'Nº Empleado' },
        { name: 'nombre', type: 'text', placeholder: 'Nombre' },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos' },
        { name: 'dni', type: 'text', placeholder: 'DNI' },
        { name: 'salario', type: 'number', placeholder: 'Salario Mensual (€)' }, // CAMPO NUEVO
        { name: 'telefono', type: 'tel', placeholder: 'Teléfono' },
        { name: 'email', type: 'email', placeholder: 'Email' },
        { name: 'puesto', type: 'text', placeholder: 'Puesto' },
        { name: 'contrato', type: 'text', placeholder: 'Contrato', value: 'Indefinido' },
        // Campos para login (opcionales)
        { name: 'usuario', type: 'text', placeholder: 'Usuario App (ej: juan)' },
        { name: 'password', type: 'password', placeholder: 'Contraseña App' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Elegir foto',
          handler: () => {
            const input = document.getElementById('file-modal') as HTMLInputElement;
            input?.click();
            return false; 
          }
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (!data.nombre) return;
            const newEmp: any = {
              ...data,
              salario: Number(data.salario),
              photo: this.pendingModalPhotoData || '',
              status: 'Activo',
              // Asignamos rol basado en puesto o por defecto 'empleado'
              rol: data.puesto ? data.puesto.toLowerCase().split(' ')[0] : 'empleado' 
            };

            this.api.guardarEmpleado(newEmp).subscribe(() => {
              this.loadData();
              setTimeout(() => this.scrollToBottom(), 200);
            });
          }
        }
      ]
    });
    await alert.present();
    this.attachPasswordToggleToAlert(alert as any);
  }

  async editEmployee(emp: Employee) {
    this.modalEditingId = emp.id;
    this.pendingModalPhotoData = null;

    const alert = await this.alertController.create({
      header: 'Editar empleado',
      inputs: [
        { name: 'numero', type: 'text', value: emp.numero, placeholder: 'Nº Empleado' },
        { name: 'nombre', type: 'text', value: emp.nombre, placeholder: 'Nombre' },
        { name: 'apellidos', type: 'text', value: emp.apellidos, placeholder: 'Apellidos' },
        { name: 'dni', type: 'text', value: emp.dni, placeholder: 'DNI' },
        { name: 'salario', type: 'number', value: emp.salario, placeholder: 'Salario (€)' }, // CAMPO NUEVO
        { name: 'telefono', type: 'tel', value: emp.telefono, placeholder: 'Teléfono' },
        { name: 'email', type: 'email', value: emp.email, placeholder: 'Email' },
        { name: 'puesto', type: 'text', value: emp.puesto, placeholder: 'Puesto' },
        { name: 'contrato', type: 'text', value: emp.contrato, placeholder: 'Contrato' },
        { name: 'usuario', type: 'text', value: emp.usuario, placeholder: 'Usuario App' },
        { name: 'password', type: 'password', value: emp.password, placeholder: 'Contraseña App' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Elegir foto',
          handler: () => {
            const input = document.getElementById('file-modal') as HTMLInputElement;
            input?.click();
            return false;
          }
        },
        {
          text: 'Guardar',
          handler: (data) => {
            const updatedEmp = {
              ...emp,
              ...data,
              salario: Number(data.salario),
              photo: this.pendingModalPhotoData || emp.photo
            };
            this.api.editarEmpleado(emp.id, updatedEmp).subscribe(() => this.loadData());
          }
        }
      ]
    });
    await alert.present();
    this.attachPasswordToggleToAlert(alert as any);
  }

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
            if (val) {
              this.api.editarEmpleado(emp.id, { ...emp, status: val }).subscribe(() => this.loadData());
            }
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
        {
          text: 'Eliminar',
          handler: () => {
            this.api.eliminarEmpleado(emp.id).subscribe(() => this.loadData());
          }
        }
      ]
    });
    await alert.present();
  }

  // --- GESTIÓN DE FOTOS ---

  onAvatarClick(emp: Employee, photo?: string) {
    if (photo) {
      this.currentPreviewEmployee = emp;
      this.openPreview(photo);
    } else {
      // Buscar índice visual para disparar el input file
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
      // --- PROCESO DE COMPRESIÓN ---
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400; // La dejamos en un tamaño pequeño para perfil
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convertimos a base64 con calidad baja (0.5) para que pese poquísimo
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

      // Ahora sí, enviamos la foto pequeña a la API
      console.log('Enviando foto comprimida...');
      this.api.editarEmpleado(emp.id, { ...emp, photo: dataUrl }).subscribe({
        next: () => {
          console.log('Foto actualizada con éxito');
          this.loadData();
        },
        error: (err) => console.error('Error al subir foto:', err)
      });
    };
  };
  reader.readAsDataURL(file);
  input.value = '';
}

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

        // Guardamos la foto comprimida para cuando el usuario guarde en el modal
        this.pendingModalPhotoData = dataUrl;
        input.value = '';
      };
    };
    reader.readAsDataURL(file);
  }

  // Inyecta un botón mostrar/ocultar en el input password del último alert abierto
  private attachPasswordToggleToAlert(alertElParam?: any) {
    try {
      const alertEl = alertElParam || (Array.from(document.querySelectorAll('ion-alert')).pop() as any);
      if (!alertEl) return;

      // Delay corto para que el alert renderice sus inputs en el shadow DOM
      setTimeout(() => {
        try {
          const root = (alertEl.shadowRoot || alertEl) as ShadowRoot | any;
          if (!root) return;

          // Intentamos localizar el input password dentro del shadowRoot
          let pwInput: HTMLInputElement | null = null;
          // 1) Buscar dentro de contenedores .alert-input
          const inputContainers = Array.from(root.querySelectorAll && root.querySelectorAll('.alert-input') || [] ) as HTMLElement[];
          if (inputContainers.length) {
            for (const c of inputContainers) {
              const inp = c.querySelector('input[type="password"]') as HTMLInputElement | null;
              if (inp) { pwInput = inp; break; }
            }
          }

          // 2) fallback: buscar cualquier input[type=password] en shadowRoot
          if (!pwInput && root.querySelector) {
            pwInput = root.querySelector('input[type="password"]') as HTMLInputElement | null;
          }

          if (!pwInput) return;

          // Evitar duplicar el botón
          if (root.querySelector && root.querySelector('.pw-toggle-btn')) return;

          const wrapper = pwInput.parentElement as HTMLElement | null;
          if (wrapper) wrapper.style.position = wrapper.style.position || 'relative';
          pwInput.style.paddingRight = '56px';

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pw-toggle-btn';
          btn.textContent = 'Mostrar';
          btn.style.position = 'absolute';
          btn.style.right = '8px';
          btn.style.top = '50%';
          btn.style.transform = 'translateY(-50%)';
          btn.style.background = 'transparent';
          btn.style.border = 'none';
          btn.style.color = 'var(--ion-color-primary, #3880ff)';
          btn.style.cursor = 'pointer';
          btn.style.padding = '4px 6px';
          btn.style.fontSize = '0.9rem';

          btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (pwInput!.type === 'password') {
              pwInput!.type = 'text';
              btn.textContent = 'Ocultar';
            } else {
              pwInput!.type = 'password';
              btn.textContent = 'Mostrar';
            }
            pwInput!.focus();
          });

          // Insertar el botón en el wrapper si existe, si no en el root
          if (wrapper) wrapper.appendChild(btn);
          else if (root.appendChild) root.appendChild(btn as any);
        } catch (e) {
          console.error('attachPasswordToggleToAlert error inner:', e);
        }
      }, 60);
    } catch (e) {
      console.error('attachPasswordToggleToAlert error:', e);
    }
  }

  // --- PREVIEW ---
  openPreview(photo: string) {
    this.previewImage = photo;
    this.previewVisible = true;
  }
  closePreview() {
    this.previewVisible = false;
    this.previewImage = null;
    this.currentPreviewEmployee = null;
  }
  triggerModalFileInput() {
    this.closePreview();
    if (this.currentPreviewEmployee) {
      this.editEmployee(this.currentPreviewEmployee);
    }
  }

  // --- HELPERS ---
  formatCurrency(value: number | undefined) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
  }

  scrollToBottom() { this.content?.scrollToBottom(300); }
  onContentScroll(ev: any) { this.showScrollTop = (ev?.detail?.scrollTop ?? 0) > 200; }
  scrollToTop() { this.content?.scrollToTop(300); }
}