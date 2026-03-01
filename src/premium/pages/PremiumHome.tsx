import { cars } from "@/data/cars";
import { HeroSection } from "../sections/HeroSection";
import { FeaturedCarsSection } from "../sections/FeaturedCarsSection";
import { PremiumFilterPanel } from "../sections/PremiumFilterPanel";
import { BenefitsSection } from "../sections/BenefitsSection";
import { CtaSection } from "../sections/CtaSection";

const PremiumHome = () => {
  const heroCar = cars[0];
  const featuredCars = cars.slice(0, 8);

  console.log("PremiumHome rendered", { heroCar, carsCount: cars.length });

  if (!heroCar) {
    return (
      <section className="mx-auto w-full max-w-[1600px] px-4 py-16 text-zinc-300 sm:px-6 lg:px-12">
        No vehicles available.
      </section>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 text-zinc-100 sm:px-6 lg:px-12">
        <h1 className="text-4xl font-bold">Premium Home Page</h1>
        <p className="mt-4 text-zinc-300">Cars count: {cars.length}</p>
      </div>
      <HeroSection car={heroCar} />
      <FeaturedCarsSection cars={featuredCars} />
      <PremiumFilterPanel cars={cars} />
      <BenefitsSection />
      <CtaSection />
    </>
  );
};

export default PremiumHome;
