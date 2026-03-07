import { create } from 'zustand';
import { cars, Car, CarStatus } from '@/data/cars';

export interface Filters {
  brand: string | null;
  status: CarStatus | null;
  search: string;
  yearFrom: number | null;
  yearTo: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  mileageMax: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyType: string | null;
  color: string | null;
}

const defaultFilters: Filters = {
  brand: null,
  status: null,
  search: '',
  yearFrom: null,
  yearTo: null,
  priceFrom: null,
  priceTo: null,
  mileageMax: null,
  fuelType: null,
  transmission: null,
  drivetrain: null,
  bodyType: null,
  color: null,
};

interface CarsState {
  cars: Car[];
  filters: Filters;
  loadCars: () => Promise<void>;
  setCars: (cars: Car[]) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setBrand: (brand: string | null) => void;
  setStatus: (status: CarStatus | null) => void;
  setSearch: (search: string) => void;
  filteredCars: () => Car[];
  activeFilterCount: () => number;
}

export const useCarsStore = create<CarsState>((set, get) => ({
  cars,
  filters: { ...defaultFilters },
  setCars: (cars) => set({ cars }),
  loadCars: async () => {
    try {
      const response = await fetch(`/data/cars.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const nextCars = Array.isArray(payload) ? payload : Array.isArray(payload?.cars) ? payload.cars : null;
      if (nextCars && nextCars.length > 0) {
        set({ cars: nextCars as Car[] });
      }
    } catch {
      // keep bundled fallback cars
    }
  },
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setBrand: (brand) => set((s) => ({ filters: { ...s.filters, brand } })),
  setStatus: (status) => set((s) => ({ filters: { ...s.filters, status } })),
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),
  filteredCars: () => {
    const { cars, filters } = get();
    return cars.filter((car) => {
      if (filters.brand && car.brand !== filters.brand) return false;
      if (filters.status && car.status !== filters.status) return false;
      if (filters.yearFrom && car.year < filters.yearFrom) return false;
      if (filters.yearTo && car.year > filters.yearTo) return false;
      if (filters.priceFrom && car.price < filters.priceFrom) return false;
      if (filters.priceTo && car.price > filters.priceTo) return false;
      if (filters.mileageMax && car.mileage > filters.mileageMax) return false;
      if (filters.fuelType && car.fuelType !== filters.fuelType) return false;
      if (filters.transmission && car.transmission !== filters.transmission) return false;
      if (filters.drivetrain && car.drivetrain !== filters.drivetrain) return false;
      if (filters.bodyType && car.bodyType !== filters.bodyType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = `${car.brand} ${car.model} ${car.trim} ${car.year} ${car.vin} ${car.color}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  },
  activeFilterCount: () => {
    const { filters } = get();
    let count = 0;
    if (filters.yearFrom) count++;
    if (filters.yearTo) count++;
    if (filters.priceFrom) count++;
    if (filters.priceTo) count++;
    if (filters.mileageMax) count++;
    if (filters.fuelType) count++;
    if (filters.transmission) count++;
    if (filters.drivetrain) count++;
    if (filters.bodyType) count++;
    if (filters.color) count++;
    return count;
  },
}));
