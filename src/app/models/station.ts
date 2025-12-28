export interface StationPrices {
  [fuelName: string]: number | null;
}

export interface Gasolinera {
  id: string;
  rotulo: string;
  direccion: string;
  municipio: string;
  provincia: string;
  codigoPostal: string;
  latitud: number;           // Usa solo lat (no latitud y lat)
  longitud: number;          // Usa solo lon (no longitud y lon)
  localidad: string;
  margen: string;
  tipoVenta: string;
  horario: string;
  precios: StationPrices; // Objeto de precios
  remision: string;
  bioEtanol: string;
  esterMetilico: string;
  porcentajeBioEtanol: string;
  porcentajeEsterMetilico: string;
  
  // Propiedades calculadas
  distanceKm?: number;
  
  // Propiedades individuales de precios (mantén si las necesitas)
  precioGasolina95: number;
  precioGasolina98: number;
  precioDiesel: number;
  precioDieselPremium: number;
  precioGLP: number;
}