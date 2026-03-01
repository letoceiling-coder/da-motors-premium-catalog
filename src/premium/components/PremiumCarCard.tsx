import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Car, formatMileage, formatPrice, statusLabels } from "@/data/cars";

interface PremiumCarCardProps {
  car: Car;
}

export function PremiumCarCard({ car }: PremiumCarCardProps) {
  return (
    <motion.article
      whileHover={{ scale: 1.04, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
    >
      <Link to={`/premium/car/${car.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={car.photos[0] || "/placeholder.svg"}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-100 backdrop-blur-sm">
            {statusLabels[car.status]}
          </span>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{car.brand}</p>
              <h3 className="mt-1 text-lg font-semibold leading-tight text-zinc-100">
                {car.model}
              </h3>
            </div>
            <span className="text-xs text-zinc-300">{car.year}</span>
          </div>

          <p className="text-sm text-zinc-400 line-clamp-1">{car.trim}</p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-zinc-50">{formatPrice(car.price)}</p>
              <p className="text-xs text-zinc-400">{formatMileage(car.mileage)}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-zinc-100 transition group-hover:bg-white/20">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
