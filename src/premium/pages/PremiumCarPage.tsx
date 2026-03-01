import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  cars,
  drivetrainLabels,
  formatMileage,
  formatPrice,
  fuelTypeLabels,
  transmissionLabels,
} from "@/data/cars";
import { PremiumCarCard } from "../components/PremiumCarCard";
import { Reveal } from "../components/Reveal";

const PremiumCarPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const car = cars.find((entry) => entry.id === id);

  const [activePhoto, setActivePhoto] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const relatedCars = useMemo(() => {
    if (!car) return [];
    return cars
      .filter((entry) => entry.id !== car.id)
      .filter((entry) => entry.brand === car.brand || entry.bodyType === car.bodyType)
      .slice(0, 4);
  }, [car]);

  if (!car) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-[1600px] flex-col items-start justify-center gap-6 px-4 sm:px-6 lg:px-12">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Premium</p>
        <h1 className="text-3xl font-semibold text-zinc-100">Vehicle not found</h1>
        <Link
          to="/premium/catalog"
          className="rounded-full border border-white/20 px-6 py-3 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          Back to catalog
        </Link>
      </section>
    );
  }

  const photo = car.photos[activePhoto] || "/placeholder.svg";
  const specsRows = [
    { label: "Year", value: String(car.year) },
    { label: "Mileage", value: formatMileage(car.mileage) },
    { label: "Fuel", value: fuelTypeLabels[car.fuelType] },
    { label: "Engine", value: `${car.engineVolume} L / ${car.power} hp` },
    { label: "Transmission", value: transmissionLabels[car.transmission] },
    { label: "Drivetrain", value: drivetrainLabels[car.drivetrain] },
    { label: "Color", value: car.color },
    { label: "VIN", value: car.vin },
  ];

  const advancedSpecs = [
    ...Object.entries(car.specs.engine),
    ...Object.entries(car.specs.transmission),
    ...Object.entries(car.specs.suspension),
  ];

  const featureList = [
    ...car.specs.safety,
    ...car.specs.comfort,
    ...car.specs.multimedia,
    ...car.specs.additional,
  ];

  const openPrev = () => {
    setActivePhoto((prev) => (prev - 1 + car.photos.length) % car.photos.length);
  };

  const openNext = () => {
    setActivePhoto((prev) => (prev + 1) % car.photos.length);
  };

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Reveal>
            <div>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
                <img
                  src={photo}
                  alt={`${car.brand} ${car.model}`}
                  className="aspect-[16/10] w-full object-cover"
                />
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs text-zinc-100 backdrop-blur-sm transition hover:bg-black/60"
                >
                  <Expand className="h-4 w-4" />
                  Open gallery
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {car.photos.map((item, index) => (
                  <button
                    key={`${item}-${index}`}
                    onClick={() => setActivePhoto(index)}
                    className={`overflow-hidden rounded-2xl border transition ${
                      index === activePhoto
                        ? "border-cyan-300/70 ring-1 ring-cyan-300/40"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <img src={item} alt="" className="aspect-[4/3] w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-[2rem] border border-white/15 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{car.brand}</p>
                <h1 className="mt-2 text-3xl font-semibold text-zinc-100">{car.model}</h1>
                <p className="mt-2 text-sm text-zinc-400">{car.trim}</p>
                <p className="mt-4 text-4xl font-semibold text-zinc-50">{formatPrice(car.price)}</p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {specsRows.slice(0, 6).map((row) => (
                    <div key={row.label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{row.label}</p>
                      <p className="mt-1 text-sm text-zinc-100">{row.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  <a
                    href="tel:+74951234567"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
                  >
                    <Phone className="h-4 w-4" />
                    Contact concierge
                  </a>
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/20">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    Request tailored offer
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-zinc-300">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm">Certified premium listing</span>
                </div>
                <p className="text-sm text-zinc-400">
                  Full sourcing history, export checks and pre-delivery inspection available on
                  request.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto mt-8 w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
        <Reveal>
          <h2 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">Technical overview</h2>
        </Reveal>

        <Reveal className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {specsRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{row.label}</p>
                <p className="mt-1 text-sm text-zinc-100">{row.value}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {advancedSpecs.length > 0 && (
          <Reveal className="mt-8">
            <h3 className="text-xl font-semibold text-zinc-100">Detailed specs</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {advancedSpecs.map(([key, value]) => (
                <div
                  key={`${key}-${value}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <span className="text-zinc-400">{key}</span>
                  <span className="text-zinc-100">{value}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {featureList.length > 0 && (
          <Reveal className="mt-8">
            <h3 className="text-xl font-semibold text-zinc-100">Features</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {featureList.map((feature) => (
                <div
                  key={feature}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-300"
                >
                  {feature}
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </section>

      {relatedCars.length > 0 && (
        <section className="mx-auto mt-12 w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-12">
          <Reveal>
            <h2 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">Related vehicles</h2>
          </Reveal>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedCars.map((entry) => (
              <Reveal key={entry.id}>
                <PremiumCarCard car={entry} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/92 p-4"
          >
            <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col">
              <div className="flex items-center justify-between py-4">
                <p className="text-sm text-zinc-300">
                  {activePhoto + 1} / {car.photos.length}
                </p>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-zinc-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="relative flex flex-1 items-center justify-center">
                <motion.img
                  key={photo}
                  initial={{ opacity: 0.1, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  src={photo}
                  alt=""
                  className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain"
                />

                {car.photos.length > 1 && (
                  <>
                    <button
                      onClick={openPrev}
                      className="absolute left-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={openNext}
                      className="absolute right-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PremiumCarPage;
