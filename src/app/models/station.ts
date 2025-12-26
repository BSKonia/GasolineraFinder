export interface StationPrices {
  [fuelName: string]: number | null; // ej: { "Gasolina 95 E5": 1.589, ... }
}

export interface Station {
  id: string;              // identificador único (lo construiremos al mapear la API)
  rotulo: string;          // marca/empresa (rótulo)
  direccion: string;
  municipio: string;
  provincia: string;

  lat: number;
  lon: number;

  horario?: string;        // si viene de la API
  prices: StationPrices;   // precios por carburante

  distanceKm?: number;     // calculada con la ubicación del usuario
}
