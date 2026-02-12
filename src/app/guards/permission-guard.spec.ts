import { TestBed } from '@angular/core/testing';
import { PermissionGuard } from './permission-guard';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PermissionGuard,
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: AlertController, useValue: { create: async () => ({ present: async () => {} }) } }
      ]
    });
    guard = TestBed.inject(PermissionGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
