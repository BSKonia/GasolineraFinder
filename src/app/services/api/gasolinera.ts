import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Station } from '../../models/station';

@Injectable({ providedIn: 'root' })
export class GasolineraService {
  getGasolineras(): Observable<Station[]> {
    return of([
      {
        id: '1',
        rotulo: 'REPSOL',
        direccion: 'Gran Vía 1',
        municipio: 'Bilbao',
        provincia: 'Bizkaia',
        lat: 43.2630,
        lon: -2.9350,
        horario: 'L-D: 06:00-22:00',
        prices: {
          'Gasolina 95 E5': 1.589,
          'Gasolina 98 E5': 1.739,
          'Gasóleo A': 1.529,
        },
      },
      {
        id: '2',
        rotulo: 'BP',
        direccion: 'Autovía A-8 km 120',
        municipio: 'Barakaldo',
        provincia: 'Bizkaia',
        lat: 43.2965,
        lon: -2.9887,
        horario: '24H',
        prices: {
          'Gasolina 95 E5': 1.569,
          'Gasolina 98 E5': 1.719,
          'Gasóleo A': 1.509,
        },
      },
    ]);
  }
}
