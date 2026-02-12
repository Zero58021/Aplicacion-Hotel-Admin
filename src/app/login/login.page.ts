import { Component } from '@angular/core';
import { TitleCasePipe, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AuthService, Role } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, TitleCasePipe, NgIf],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {

  password: string = '';
  activeRole: Role | null = null;
  showPassword: boolean = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  selectRole(role: Role) {
    if (this.activeRole === role) {
      this.activeRole = null;
      this.password = '';
    } else {
      this.activeRole = role;
      this.password = '';
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async confirmLogin() {
    if (!this.activeRole) return;

    const success = this.auth.login(this.activeRole, this.password);

    if (success) {
      this.password = '';
      this.activeRole = null;
      // Always navigate to tab1 regardless of role
      this.router.navigateByUrl('/tabs/tab1');
      return;
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Contraseña incorrecta',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

}
