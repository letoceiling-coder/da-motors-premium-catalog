import { CarStatus, statusLabels } from '@/data/cars';
import { useCarsStore } from '@/stores/carsStore';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/useTelegram';

const statuses: (CarStatus | null)[] = [null, 'in_stock', 'in_transit', 'on_order'];

export function StatusFilter() {
  const current = useCarsStore((s) => s.filters.status);
  const setStatus = useCarsStore((s) => s.setStatus);
  const { selectionHaptic } = useTelegram();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
      {statuses.map((status) => (
        <button
          key={status ?? 'all'}
          onClick={() => {
            selectionHaptic();
            setStatus(status);
          }}
          className={cn(
            'whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 border',
            current === status
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-muted-foreground'
          )}
        >
          {status ? statusLabels[status] : 'Все'}
        </button>
      ))}
    </div>
  );
}
