import { Injectable } from '@angular/core';
import { Ubicacion } from '../models/location';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getCurrentLocation(options?: PositionOptions): Promise<Ubicacion> {
    return new Promise<Ubicacion>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por el navegador.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
            ciudad: 'Ubicación actual'
          });
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de geolocalización denegado.'
              : err.code === err.POSITION_UNAVAILABLE
              ? 'Ubicación no disponible (GPS/WiFi).'
              : 'Tiempo de espera agotado obteniendo ubicación.';
          reject(new Error(msg));
        },
        options ?? {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    });
  }
  
  // Método adicional para compatibilidad con el código existente
  obtenerUbicacionActual() {
    return this.getCurrentLocation();
  }
}