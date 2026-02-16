import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  // Coge la URL de tu environment (la de ngrok)
  private url = environment.apiUrl; 

  // Cabeceras para evitar bloqueos de Ngrok
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient) { }

  // ==========================================
  //               RESERVAS (Tab 2)
  // ==========================================

  getReservas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/reservas`, this.httpOptions);
  }

  // Crear nueva reserva
  guardarReserva(reserva: any): Observable<any> {
    return this.http.post<any>(`${this.url}/reservas`, reserva, this.httpOptions);
  }

  // Actualizar estado rápido (ej: botón confirmar/denegar)
  updateReserva(id: any, datos: any): Observable<any> {
    return this.http.patch<any>(`${this.url}/reservas/${id}`, datos, this.httpOptions);
  }

  // Edición completa (desde el modal)
  editarReserva(id: any, reservaCompleta: any): Observable<any> {
    return this.http.put<any>(`${this.url}/reservas/${id}`, reservaCompleta, this.httpOptions);
  }

  eliminarReserva(id: any): Observable<any> {
    return this.http.delete<any>(`${this.url}/reservas/${id}`, this.httpOptions);
  }

  // ==========================================
  //             HABITACIONES (Tab 4)
  // ==========================================

  getHabitaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/habitaciones`, this.httpOptions);
  }

  guardarNuevaHabitacion(habitacion: any): Observable<any> {
    return this.http.post<any>(`${this.url}/habitaciones`, habitacion, this.httpOptions);
  }

  // Usamos PUT para asegurar que se guardan bien los arrays de fotos y extras
  actualizarHabitacion(id: any, datos: any): Observable<any> {
    // Si solo mandas {estado: 'Sucia'}, json-server con PUT borraría el resto.
    // Pero tu Tab4 envía el objeto COMPLETO al guardar edición, así que PUT es seguro y limpio.
    // Si solo cambias estado desde el botón rápido, usa patch internamente:
    if (Object.keys(datos).length === 1 && datos.estado) {
        return this.http.patch<any>(`${this.url}/habitaciones/${id}`, datos, this.httpOptions);
    }
    return this.http.put<any>(`${this.url}/habitaciones/${id}`, datos, this.httpOptions);
  }

  borrarHabitacion(id: any): Observable<any> {
    return this.http.delete<any>(`${this.url}/habitaciones/${id}`, this.httpOptions);
  }

  // ==========================================
  //                EMPLEADOS (Tab 5)
  // ==========================================

  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/empleados`, this.httpOptions);
  }

  guardarEmpleado(empleado: any): Observable<any> {
    return this.http.post<any>(`${this.url}/empleados`, empleado, this.httpOptions);
  }

  editarEmpleado(id: any, empleado: any): Observable<any> {
    return this.http.put<any>(`${this.url}/empleados/${id}`, empleado, this.httpOptions);
  }

  eliminarEmpleado(id: any): Observable<any> {
    return this.http.delete<any>(`${this.url}/empleados/${id}`, this.httpOptions);
  }
}