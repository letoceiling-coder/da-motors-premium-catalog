import { useCarsStore } from "@/stores/carsStore";
import { HeroSection } from "../sections/HeroSection";
import { FeaturedCarsSection } from "../sections/FeaturedCarsSection";
import { PremiumFilterPanel } from "../sections/PremiumFilterPanel";
import { BenefitsSection } from "../sections/BenefitsSection";
import { CtaSection } from "../sections/CtaSection";

const PremiumHome = () => {
  const cars = useCarsStore((s) => s.cars);
  const heroCar = cars[0];
  const featuredCars = cars.slice(0, 8);

  if (!heroCar) {
    return (
      <section className="mx-auto w-full max-w-[1600px] px-4 py-16 text-zinc-300 sm:px-6 lg:px-12">
        No vehicles available.
      </section>
    );
  }

  return (
    <>
      <HeroSection car={heroCar} />
      <FeaturedCarsSection cars={featuredCars} />
      <PremiumFilterPanel cars={cars} />
      <BenefitsSection />
      <CtaSection />
    </>
  );
};

export default PremiumHome;
