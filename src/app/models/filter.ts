export type BrandMode = 'all' | 'whitelist' | 'blacklist';

export type FuelType =
  | 'Gasolina 95 E5'
  | 'Gasolina 98 E5'
  | 'Gasóleo A';

export interface Filter {
  fuel: FuelType;          // carburante seleccionado
  radiusKm: number;        // radio en km (0 = sin límite)
  brandMode: BrandMode;    // all / whitelist / blacklist
  brands: string[];        // marcas a incluir/excluir según brandMode
  sortBy: 'distance' | 'price'; // ordenación principal
}
