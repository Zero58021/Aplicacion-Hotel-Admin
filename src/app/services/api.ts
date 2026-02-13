import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private url = environment.apiUrl;

  // Cabecera vital para que Ngrok no bloquee la conexión
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient) { }

  // --- 🏨 GESTIÓN DE RESERVAS ---

  getReservas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/reservas`, this.httpOptions);
  }

  // Usamos POST para reservas nuevas creadas desde Admin
  guardarReserva(reserva: any): Observable<any> {
    return this.http.post(`${this.url}/reservas`, reserva, this.httpOptions);
  }

  // Usamos PATCH para actualizar campos sueltos (como el estado)
  updateReserva(id: any, datos: any): Observable<any> {
    return this.http.patch(`${this.url}/reservas/${id}`, datos, this.httpOptions);
  }

  // Para edición completa desde el modal de edición
  editarReserva(id: any, reserva: any): Observable<any> {
    return this.http.put(`${this.url}/reservas/${id}`, reserva, this.httpOptions);
  }

  eliminarReserva(id: any): Observable<any> {
    return this.http.delete(`${this.url}/reservas/${id}`, this.httpOptions);
  }


  // --- 🛌 GESTIÓN DE HABITACIONES ---

  getHabitaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/habitaciones`, this.httpOptions);
  }

  // Este método sirve tanto para Limpieza/Mantenimiento como para el Jefe
  actualizarHabitacion(id: any, datos: any): Observable<any> {
    return this.http.patch(`${this.url}/habitaciones/${id}`, datos, this.httpOptions);
  }

  // Para que el Jefe añada nuevas habitaciones al inventario
  guardarNuevaHabitacion(habitacion: any): Observable<any> {
    return this.http.post(`${this.url}/habitaciones`, habitacion, this.httpOptions);
  }

  // Para que el Jefe borre habitaciones del sistema
  borrarHabitacion(id: any): Observable<any> {
    return this.http.delete(`${this.url}/habitaciones/${id}`, this.httpOptions);
  }


  // --- 👥 GESTIÓN DE EQUIPO ---

  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/empleados`, this.httpOptions);
  }

  // Por si el jefe quiere editar datos de un empleado en el futuro
  actualizarEmpleado(id: any, datos: any): Observable<any> {
    return this.http.patch(`${this.url}/empleados/${id}`, datos, this.httpOptions);
  }
}