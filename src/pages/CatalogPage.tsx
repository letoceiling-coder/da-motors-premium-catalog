import { useState, useCallback, useEffect } from 'react';
import { useCarsStore } from '@/stores/carsStore';
import { BrandChips } from '@/components/BrandChips';
import { StatusFilter } from '@/components/StatusFilter';
import { CarCard } from '@/components/CarCard';
import { Header } from '@/components/Header';
import { FilterSheet } from '@/components/FilterSheet';
import { Skeleton } from '@/components/ui/skeleton';

const CatalogPage = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const filteredCars = useCarsStore((s) => {
    const { cars, filters } = s;
    return cars.filter((car) => {
      if (filters.brand && car.brand !== filters.brand) return false;
      if (filters.status && car.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = `${car.brand} ${car.model} ${car.trim} ${car.year} ${car.vin} ${car.color}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (filters.yearFrom && car.year < filters.yearFrom) return false;
      if (filters.yearTo && car.year > filters.yearTo) return false;
      if (filters.priceFrom && car.price < filters.priceFrom) return false;
      if (filters.priceTo && car.price > filters.priceTo) return false;
      if (filters.mileageMax && car.mileage > filters.mileageMax) return false;
      if (filters.fuelType && car.fuelType !== filters.fuelType) return false;
      if (filters.transmission && car.transmission !== filters.transmission) return false;
      if (filters.drivetrain && car.drivetrain !== filters.drivetrain) return false;
      if (filters.bodyType && car.bodyType !== filters.bodyType) return false;
      return true;
    });
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onOpenFilter={() => setFilterOpen(true)} />
      <div className="pt-14 max-w-lg mx-auto">
        <BrandChips />
        <StatusFilter />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 px-4">
            {filteredCars.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Автомобили не найдены
              </div>
            ) : (
              filteredCars.map((car) => <CarCard key={car.id} car={car} />)
            )}
          </div>
        )}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
};

export default CatalogPage;
