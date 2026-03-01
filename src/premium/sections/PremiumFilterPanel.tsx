import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car, CarStatus, fuelTypeLabels, statusLabels } from "@/data/cars";
import { PremiumCarCard } from "../components/PremiumCarCard";
import { Reveal } from "../components/Reveal";

interface PremiumFilterPanelProps {
  cars: Car[];
}

export function PremiumFilterPanel({ cars }: PremiumFilterPanelProps) {
  const [brand, setBrand] = useState<string>("all");
  const [status, setStatus] = useState<CarStatus | "all">("all");
  const [fuel, setFuel] = useState<string>("all");

  const brands = useMemo(
    () => ["all", ...Array.from(new Set(cars.map((car) => car.brand))).sort()],
    [cars]
  );

  const filtered = useMemo(() => {
    return cars
      .filter((car) => (brand === "all" ? true : car.brand === brand))
      .filter((car) => (status === "all" ? true : car.status === status))
      .filter((car) => (fuel === "all" ? true : car.fuelType === fuel))
      .slice(0, 4);
  }, [cars, brand, status, fuel]);

  return (
    <section className="mx-auto mt-16 w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
      <Reveal>
        <div className="rounded-[2rem] border border-white/15 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Filter</p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">
                Premium finder
              </h2>
            </div>
            <Link
              to="/premium/catalog"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              Open full catalog
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
              Brand
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-zinc-100 outline-none ring-0 transition focus:border-cyan-300/40"
              >
                {brands.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "Any brand" : item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CarStatus | "all")}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-zinc-100 outline-none ring-0 transition focus:border-cyan-300/40"
              >
                <option value="all">Any status</option>
                <option value="in_stock">{statusLabels.in_stock}</option>
                <option value="in_transit">{statusLabels.in_transit}</option>
                <option value="on_order">{statusLabels.on_order}</option>
              </select>
            </label>

            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
              Fuel
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-zinc-100 outline-none ring-0 transition focus:border-cyan-300/40"
              >
                <option value="all">Any fuel</option>
                {Object.entries(fuelTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((car) => (
          <Reveal key={car.id}>
            <PremiumCarCard car={car} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
