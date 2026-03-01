import { motion } from "framer-motion";
import { Gauge, Gem, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "../components/Reveal";

const benefits = [
  {
    icon: Gem,
    title: "Verified provenance",
    text: "Every lot is validated by VIN, service traces and visual audit before offer.",
  },
  {
    icon: Gauge,
    title: "Performance-first curation",
    text: "Selection tuned for flagship trim levels, powertrains and premium options.",
  },
  {
    icon: Truck,
    title: "Concierge logistics",
    text: "Turn-key delivery chain from sourcing to handover with status visibility.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty support",
    text: "Partner-backed post-delivery service workflow for complete peace of mind.",
  },
];

export function BenefitsSection() {
  return (
    <section className="mx-auto mt-20 w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
      <Reveal>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Why premium</p>
          <h2 className="mt-2 text-3xl font-semibold text-zinc-100 sm:text-4xl">
            Built around ownership experience
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {benefits.map((benefit, index) => (
          <motion.article
            key={benefit.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <benefit.icon className="h-5 w-5 text-cyan-300" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-100">{benefit.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
