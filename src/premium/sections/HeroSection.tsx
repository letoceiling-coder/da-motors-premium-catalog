import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Car, formatPrice } from "@/data/cars";

interface HeroSectionProps {
  car: Car;
}

const container = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: "easeOut",
      staggerChildren: 0.12,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function HeroSection({ car }: HeroSectionProps) {
  return (
    <section className="px-4 pt-6 sm:px-6 lg:px-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-[2rem] border border-white/10"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(110deg, rgba(3,5,10,0.88) 25%, rgba(8,12,20,0.45) 60%, rgba(4,6,10,0.9) 100%), url(${car.photos[0] || "/placeholder.svg"})`,
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-[1600px] items-end px-6 py-10 sm:px-10 lg:px-16 lg:py-16">
          <div className="max-w-3xl">
            <motion.p variants={item} className="text-xs uppercase tracking-[0.24em] text-zinc-300">
              Curated premium collection
            </motion.p>
            <motion.h1
              variants={item}
              className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-7xl"
            >
              {car.brand} {car.model}
            </motion.h1>
            <motion.p variants={item} className="mt-4 max-w-xl text-base text-zinc-200 sm:text-lg">
              Clean geometry, tailored sourcing and concierge delivery for clients who expect
              more than a standard showroom.
            </motion.p>
            <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/premium/catalog"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
              >
                Explore catalog
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={`/premium/car/${car.id}`}
                className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                {formatPrice(car.price)}
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
