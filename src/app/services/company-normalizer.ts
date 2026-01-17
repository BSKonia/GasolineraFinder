// src/app/services/company-normalizer.ts
import { Injectable } from '@angular/core';
import { COMPANY_PATTERNS } from '../models/filter';

@Injectable({
  providedIn: 'root',
})
export class CompanyNormalizerService {
  /**
   * Normaliza un texto para comparaciones:
   * - Mayúsculas
   * - Quita acentos
   * - Quita símbolos raros
   * - Colapsa espacios
   */
  private clean(text: string): string {
    return (text || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[^A-Z0-9\s]/g, ' ')    // símbolos -> espacio
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalizar el nombre de una empresa (de "BP BILBAO" a "BP")
  normalizeCompanyName(companyName: string): string | null {
    if (!companyName || companyName.trim() === '') return null;

    const nombre = this.clean(companyName);

    for (const [empresaNormalizada, patrones] of Object.entries(COMPANY_PATTERNS)) {
      for (const patron of patrones) {
        const patronClean = this.clean(patron);
        if (patronClean && nombre.includes(patronClean)) {
          return empresaNormalizada;
        }
      }
    }

    return null;
  }

  // Verificar si una gasolinera pertenece a una empresa normalizada
  belongsToCompany(gasolineraName: string, empresaNormalizada: string): boolean {
    if (!gasolineraName || !empresaNormalizada) return false;

    const normalizedStation = this.normalizeCompanyName(gasolineraName);

    // Si el filtro ya viene como nombre normalizado (ej: "REPSOL"), comparación directa
    if (normalizedStation && normalizedStation === empresaNormalizada) return true;

    // Si por cualquier razón el filtro viene en bruto, lo normalizamos también
    const normalizedFilter = this.normalizeCompanyName(empresaNormalizada);
    if (normalizedStation && normalizedFilter) {
      return normalizedStation === normalizedFilter;
    }

    return false;
  }

  // Extraer todas las empresas únicas normalizadas de una lista de gasolineras
  extractNormalizedCompanies(gasolineras: any[]): string[] {
    const empresasSet = new Set<string>();

    gasolineras.forEach((g) => {
      const normalized = this.normalizeCompanyName(g?.rotulo ?? '');
      if (normalized) empresasSet.add(normalized);
    });

    return Array.from(empresasSet).sort();
  }

  /**
   * Filtrar gasolineras por empresas normalizadas
   * Nota: si no se puede normalizar un rótulo, lo consideramos "OTRA".
   * - include: solo entra si en empresasSeleccionadas está "OTRA"
   * - exclude: entra siempre salvo que "OTRA" esté seleccionada para excluir
   */
  filterByNormalizedCompanies(
    gasolineras: any[],
    empresasSeleccionadas: string[],
    mode: 'include' | 'exclude'
  ): any[] {
    const selected = (empresasSeleccionadas ?? []).filter(Boolean);

    return (gasolineras ?? []).filter((gasolinera) => {
      const rotulo = gasolinera?.rotulo ?? '';
      const empresaNorm = this.normalizeCompanyName(rotulo) ?? 'OTRA';

      const pertenece = selected.includes(empresaNorm);

      if (mode === 'include') return pertenece;
      return !pertenece; // exclude
    });
  }
}
