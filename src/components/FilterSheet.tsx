import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCarsStore } from '@/stores/carsStore';
import { brands, fuelTypeLabels, transmissionLabels, drivetrainLabels, bodyTypeLabels } from '@/data/cars';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const filters = useCarsStore((s) => s.filters);
  const setFilter = useCarsStore((s) => s.setFilter);
  const resetFilters = useCarsStore((s) => s.resetFilters);

  const handleApply = () => onClose();
  const handleReset = () => {
    resetFilters();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">Фильтры</SheetTitle>
          <SheetDescription className="sr-only">Настройте параметры поиска автомобилей</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Brand */}
          <FilterSelect
            label="Марка"
            value={filters.brand ?? ''}
            onValueChange={(v) => setFilter('brand', v || null)}
            options={brands.map((b) => ({ value: b, label: b }))}
          />

          {/* Fuel */}
          <FilterSelect
            label="Тип топлива"
            value={filters.fuelType ?? ''}
            onValueChange={(v) => setFilter('fuelType', v || null)}
            options={Object.entries(fuelTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
          />

          {/* Transmission */}
          <FilterSelect
            label="Коробка передач"
            value={filters.transmission ?? ''}
            onValueChange={(v) => setFilter('transmission', v || null)}
            options={Object.entries(transmissionLabels).map(([k, v]) => ({ value: k, label: v }))}
          />

          {/* Drivetrain */}
          <FilterSelect
            label="Привод"
            value={filters.drivetrain ?? ''}
            onValueChange={(v) => setFilter('drivetrain', v || null)}
            options={Object.entries(drivetrainLabels).map(([k, v]) => ({ value: k, label: v }))}
          />

          {/* Body Type */}
          <FilterSelect
            label="Тип кузова"
            value={filters.bodyType ?? ''}
            onValueChange={(v) => setFilter('bodyType', v || null)}
            options={Object.entries(bodyTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
          />

          {/* Year range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Год от</label>
              <Input
                type="number"
                placeholder="2020"
                value={filters.yearFrom ?? ''}
                onChange={(e) => setFilter('yearFrom', e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Год до</label>
              <Input
                type="number"
                placeholder="2024"
                value={filters.yearTo ?? ''}
                onChange={(e) => setFilter('yearTo', e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Price range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Цена от</label>
              <Input
                type="number"
                placeholder="3 000 000"
                value={filters.priceFrom ?? ''}
                onChange={(e) => setFilter('priceFrom', e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Цена до</label>
              <Input
                type="number"
                placeholder="30 000 000"
                value={filters.priceTo ?? ''}
                onChange={(e) => setFilter('priceTo', e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Пробег до (км)</label>
            <Input
              type="number"
              placeholder="100 000"
              value={filters.mileageMax ?? ''}
              onChange={(e) => setFilter('mileageMax', e.target.value ? Number(e.target.value) : null)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-accent"
          >
            Сбросить
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all active:scale-[0.98]"
          >
            Применить
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSelect({ label, value, onValueChange, options }: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const handleValueChange = (v: string) => {
    // Convert "all" back to empty string for clearing filter
    onValueChange(v === "all" ? "" : v);
  };

  const displayValue = value || "all";

  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <Select value={displayValue} onValueChange={handleValueChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Любой" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
