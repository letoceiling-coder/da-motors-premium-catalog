import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";

export function CtaSection() {
  return (
    <section className="mx-auto mt-20 w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-indigo-500/35 via-violet-500/20 to-cyan-500/30 p-8 shadow-[0_24px_80px_rgba(51,65,185,0.28)] lg:p-12">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-56 rounded-full bg-cyan-300/20 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-200/80">DA Premium</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                Request a private selection tailored to your exact configuration.
              </h2>
            </div>
            <Link
              to="/premium/catalog"
              className="inline-flex items-center gap-2 self-start rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Start now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
