import { Component, NgZone, Renderer2 } from '@angular/core';
import { TitleCasePipe, NgIf, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, TitleCasePipe, NgIf, CommonModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {

  username: string = '';
  password: string = '';
  showPassword: boolean = false;

  // Variables Easter Egg
  isZeroGravity: boolean = false;
  private clickCount = 0;
  private clickTimer: any;

  // Variables Drag & Drop
  private activeItem: HTMLElement | null = null;
  private initialX = 0;
  private initialY = 0;
  private currentX = 0;
  private currentY = 0;
  private xOffset = 0;
  private yOffset = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private ngZone: NgZone,
    private renderer: Renderer2
  ) {}

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async confirmLogin() {
    if (!this.username.trim() || !this.password.trim()) {
      const alert = await this.alertCtrl.create({
        header: 'Campos vacíos',
        message: 'Por favor, introduce tu usuario y contraseña.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const success = await this.auth.login(this.username.trim(), this.password);

    if (success) {
      this.username = '';
      this.password = '';
      this.router.navigateByUrl('/tabs/tab1');
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Usuario o contraseña incorrectos.',
        buttons: ['Reintentar']
      });
      await alert.present();
    }
  }

  // --- LÓGICA GRAVEDAD CERO ---
  onCloudClick() {
    this.clickCount++;
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => { this.clickCount = 0; }, 500);

    if (this.clickCount >= 5) {
      this.activateZeroGravity();
      this.clickCount = 0;
    }
  }

  activateZeroGravity() {
    if (this.isZeroGravity) return;
    this.ngZone.run(() => {
      console.log('🚀 GRAVEDAD CERO ACTIVADA');
      this.isZeroGravity = true;

      setTimeout(() => {
        this.isZeroGravity = false;
        // Limpiar estilos al acabar
        const items = document.querySelectorAll('.float-item');
        items.forEach((el: any) => {
          el.style.transform = '';
          el.classList.remove('is-dragging');
        });
      }, 15000); // 15 segundos
    });
  }

  // --- LÓGICA DE ARRASTRE REAL ---
  dragStart(e: any) {
    if (!this.isZeroGravity) return;
    
    const target = e.target.closest('.float-item');
    if (!target) return;

    this.activeItem = target;
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    if (!this.activeItem) return;
    const style = window.getComputedStyle(this.activeItem);
    const matrix = new WebKitCSSMatrix(style.transform);
    
    this.xOffset = matrix.m41; 
    this.yOffset = matrix.m42;

    this.initialX = clientX - this.xOffset;
    this.initialY = clientY - this.yOffset;

    this.renderer.addClass(this.activeItem, 'is-dragging');
  }

  dragMove(e: any) {
    if (!this.activeItem) return;
    e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    this.currentX = clientX - this.initialX;
    this.currentY = clientY - this.initialY;

    this.setTranslate(this.currentX, this.currentY, this.activeItem);
  }

  dragEnd() {
    if (this.activeItem) {
      this.renderer.removeClass(this.activeItem, 'is-dragging');
      this.xOffset = this.currentX;
      this.yOffset = this.currentY;
      
      this.activeItem = null;
    }
  }

  setTranslate(xPos: number, yPos: number, el: HTMLElement) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  onTouchStart(e: any) { this.dragStart(e); }
  onTouchMove(e: any) { this.dragMove(e); }
  onDragEnd() { this.dragEnd(); }
  onMouseDown(e: any) { this.dragStart(e); }
  onMouseMove(e: any) { this.dragMove(e); }
}