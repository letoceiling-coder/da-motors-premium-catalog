import { Heart, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Car, formatPrice, formatMileage, statusLabels } from '@/data/cars';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useTelegram } from '@/hooks/useTelegram';
import { cn } from '@/lib/utils';

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  const navigate = useNavigate();
  const { toggle, isFavorite } = useFavoritesStore();
  const fav = isFavorite(car.id);
  const { haptic } = useTelegram();

  const statusColor: Record<string, string> = {
    in_stock: 'bg-green-600/90 text-white',
    in_transit: 'bg-yellow-600/90 text-white',
    on_order: 'bg-muted-foreground/80 text-white',
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden border shadow-sm">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={car.photos[0]}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            haptic('light');
            toggle(car.id);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
        >
          <Heart
            className={cn('w-4 h-4', fav ? 'fill-primary text-primary' : 'text-foreground')}
          />
        </button>
        {/* Status badge */}
        <span className={cn('absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold', statusColor[car.status])}>
          {statusLabels[car.status]}
        </span>
        {/* Photo count */}
        <span className="absolute bottom-2 right-2 bg-background/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1">
          <Camera className="w-3 h-3" />
          {car.photos.length}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold leading-tight">
          {car.brand} {car.model}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{car.trim}</p>
        <p className="text-lg font-bold mt-1.5 text-foreground">{formatPrice(car.price)}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span>{car.year}</span>
          <span className="w-px h-3 bg-border" />
          <span>{formatMileage(car.mileage)}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          {car.engineVolume > 0 && <span>{car.engineVolume} л</span>}
          {car.engineVolume > 0 && <span className="w-px h-3 bg-border" />}
          <span>{car.power} л.с.</span>
        </div>
        <button
          onClick={() => {
            haptic('light');
            navigate(`/car/${car.id}`);
          }}
          className="w-full mt-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all active:scale-[0.98]"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}
