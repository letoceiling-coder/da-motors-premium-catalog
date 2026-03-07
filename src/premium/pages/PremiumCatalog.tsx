import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { BodyType } from "@/data/cars";
import { PremiumCarCard } from "../components/PremiumCarCard";
import { Reveal } from "../components/Reveal";
import { useCarsStore } from "@/stores/carsStore";

const bodyTypeLabels: Record<BodyType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  coupe: "Coupe",
  hatchback: "Hatchback",
  convertible: "Convertible",
  wagon: "Wagon",
};

const gridContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const PremiumCatalog = () => {
  const cars = useCarsStore((s) => s.cars);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [bodyType, setBodyType] = useState<BodyType | "all">("all");

  const brands = useMemo(
    () => ["all", ...Array.from(new Set(cars.map((car) => car.brand))).sort()],
    [cars]
  );

  const filteredCars = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cars.filter((car) => {
      if (brand !== "all" && car.brand !== brand) return false;
      if (bodyType !== "all" && car.bodyType !== bodyType) return false;
      if (!normalized) return true;
      const bag = `${car.brand} ${car.model} ${car.trim} ${car.year} ${car.vin}`.toLowerCase();
      return bag.includes(normalized);
    });
  }, [brand, bodyType, query]);

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-100 sm:text-4xl lg:text-5xl">
              Premium inventory
            </h1>
          </div>
          <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400">
            {filteredCars.length} cars available
          </span>
        </div>
      </Reveal>

      <Reveal className="mt-8">
        <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur-xl md:grid-cols-[1fr,220px,220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by model, brand, VIN..."
              className="w-full rounded-xl border border-white/15 bg-black/30 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/40"
            />
          </label>

          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/40"
          >
            {brands.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All brands" : item}
              </option>
            ))}
          </select>

          <select
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value as BodyType | "all")}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/40"
          >
            <option value="all">Any body type</option>
            {Object.entries(bodyTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Reveal>

      <motion.div
        variants={gridContainer}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {filteredCars.map((car) => (
          <motion.div key={car.id} variants={gridItem}>
            <PremiumCarCard car={car} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default PremiumCatalog;
