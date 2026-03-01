import { useFavoritesStore } from '@/stores/favoritesStore';
import { useCarsStore } from '@/stores/carsStore';
import { CarCard } from '@/components/CarCard';
import { Heart } from 'lucide-react';

const FavoritesPage = () => {
  const favIds = useFavoritesStore((s) => s.ids);
  const allCars = useCarsStore((s) => s.cars);
  const favCars = allCars.filter((c) => favIds.includes(c.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="h-14 flex items-center px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Избранное</h1>
        </div>
      </div>
      <div className="pt-16 max-w-lg mx-auto px-4">
        {favCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Heart className="w-10 h-10 mb-3" strokeWidth={1} />
            <p className="text-sm">Нет избранных автомобилей</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {favCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
