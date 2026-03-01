import { Car } from "@/data/cars";
import { PremiumCarCard } from "../components/PremiumCarCard";
import { Reveal } from "../components/Reveal";

interface FeaturedCarsSectionProps {
  cars: Car[];
}

export function FeaturedCarsSection({ cars }: FeaturedCarsSectionProps) {
  return (
    <section className="mx-auto mt-16 w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
      <Reveal>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Featured</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-100 sm:text-4xl">Spotlight cars</h2>
          </div>
          <span className="hidden rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 md:inline-block">
            Hand-picked right now
          </span>
        </div>
      </Reveal>

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {cars.map((car) => (
          <div key={car.id} className="min-w-[320px] snap-start md:min-w-[360px]">
            <PremiumCarCard car={car} />
          </div>
        ))}
      </div>
    </section>
  );
}
