import { motion, useScroll, useSpring } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/premium", label: "Home" },
  { to: "/premium/catalog", label: "Catalog" },
];

const PremiumLayout = () => {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  console.log("PremiumLayout rendered", { pathname: location.pathname });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#06070d] text-zinc-100 [color-scheme:dark]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <motion.div
        style={{ scaleX: progress }}
        className="fixed left-0 right-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500"
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-6 lg:px-12">
          <NavLink to="/premium" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Crown className="h-5 w-5 text-amber-300" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-100">
              DA Premium
            </span>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm transition ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <a
            href="#premium-contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Concierge
          </a>
        </div>
      </header>

      <main className="relative z-10 scroll-smooth pb-20">
        <Outlet />
      </main>

      <footer
        id="premium-contact"
        className="relative z-10 border-t border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-zinc-400"
      >
        DA Premium Collection - Private sourcing and delivery
      </footer>
    </div>
  );
};

export default PremiumLayout;
