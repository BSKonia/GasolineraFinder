export type BrandMode = 'all' | 'whitelist' | 'blacklist';

export type FuelType =
  | 'Gasolina 95 E5'
  | 'Gasolina 98 E5'
  | 'Gasóleo A'
  | 'Gasóleo Premium'
  | 'GLP';

export interface Filtros {
    tipoCombustible: 'todos' | 'gasolina95' | 'gasolina98' | 'diesel' | 'dieselPremium' | 'glp';
    empresas: string[];
    precioMaximo: number;
    distanciaMaxima: number;
    soloAbiertas: boolean;
    ordenarPor: 'precio' | 'distancia' | 'nombre';
}