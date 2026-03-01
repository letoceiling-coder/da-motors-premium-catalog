import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useCarsStore } from '@/stores/carsStore';
import { useUserStore } from '@/stores/userStore';
import { CarCard } from '@/components/CarCard';

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const cars = useCarsStore((s) => s.cars);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useUserStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return cars.filter((car) => {
      const s = `${car.brand} ${car.model} ${car.trim} ${car.year} ${car.vin} ${car.color}`.toLowerCase();
      return s.includes(q);
    });
  }, [query, cars]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) addRecentSearch(q.trim());
  }, [addRecentSearch]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center gap-2 px-4 h-14 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Марка, модель, VIN..."
              className="pr-8"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-16 max-w-lg mx-auto px-4">
        {!query.trim() && recentSearches.length > 0 && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Недавние</span>
              <button onClick={clearRecentSearches} className="text-xs text-primary">Очистить</button>
            </div>
            <div className="space-y-1">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="flex items-center gap-2 w-full py-2 text-sm hover:bg-accent rounded px-2 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && (
          <div className="py-4">
            <p className="text-xs text-muted-foreground mb-4">
              {results.length > 0 ? `Найдено: ${results.length}` : 'Ничего не найдено'}
            </p>
            <div className="grid grid-cols-1 gap-4">
              {results.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
