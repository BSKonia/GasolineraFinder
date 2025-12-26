import { Injectable } from '@angular/core';
import { Location } from '../models/location';

@Injectable({ providedIn: 'root' })
export class Geolocation {
  getCurrentLocation(options?: PositionOptions): Promise<Location> {
    return new Promise<Location>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por el navegador.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
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
}
