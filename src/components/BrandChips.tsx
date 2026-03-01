import { useRef } from 'react';
import { brands } from '@/data/cars';
import { useCarsStore } from '@/stores/carsStore';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/useTelegram';

export function BrandChips() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentBrand = useCarsStore((s) => s.filters.brand);
  const setBrand = useCarsStore((s) => s.setBrand);
  const { selectionHaptic } = useTelegram();

  const allBrands = [null, ...brands];

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3"
    >
      {allBrands.map((brand) => (
        <button
          key={brand ?? 'all'}
          onClick={() => {
            selectionHaptic();
            setBrand(brand);
          }}
          className={cn(
            'whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0',
            currentBrand === brand
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {brand ?? 'Все'}
        </button>
      ))}
    </div>
  );
}
