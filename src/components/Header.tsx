import { SlidersHorizontal, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCarsStore } from '@/stores/carsStore';

interface HeaderProps {
  onOpenFilter: () => void;
}

export function Header({ onOpenFilter }: HeaderProps) {
  const navigate = useNavigate();
  const filterCount = useCarsStore((s) => {
    const { filters } = s;
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
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <button
          type="button"
          className="inline-flex items-center"
          onClick={() => navigate('/')}
          aria-label="На главную"
        >
          <img src="/logo.png" alt="DA Motors" className="h-9 w-auto object-contain" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFilter}
            className="relative p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Фильтры"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {filterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/search')}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Поиск"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Профиль"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
