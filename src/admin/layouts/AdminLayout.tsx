import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bot, LayoutDashboard, LogOut, Megaphone, Shield, Users } from "lucide-react";
import { useAdminAuth } from "@/admin/auth";

const navItems = [
  { to: "/admin/dashboard", label: "Панель управления", icon: LayoutDashboard },
  { to: "/admin/bot", label: "Бот", icon: Bot },
  { to: "/admin/broadcast", label: "Рассылка", icon: Megaphone },
  { to: "/admin/users", label: "Пользователи", icon: Users },
];

function pageTitle(pathname: string) {
  if (pathname.startsWith("/admin/bot")) return "Настройка Telegram-бота";
  if (pathname.startsWith("/admin/broadcast")) return "Рассылка";
  if (pathname.startsWith("/admin/users")) return "Пользователи";
  return "Панель управления";
}

export function AdminLayout() {
  const location = useLocation();
  const { currentUser, logout } = useAdminAuth();
  const initials =
    currentUser?.fullName
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <div className="admin-ui flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-gray-900 text-gray-100 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
          <div className="rounded-lg bg-blue-600/90 p-2">
            <Shield className="h-5 w-5" />
          </div>
          <div className="font-semibold">Motors Admin</div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-gray-800 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{currentUser?.fullName}</p>
              <p className="truncate text-xs text-gray-400">{currentUser?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium uppercase tracking-wide text-white lg:hidden"
            >
              Admin
            </Link>
            <h1 className="text-sm font-semibold text-gray-900 sm:text-base">{pageTitle(location.pathname)}</h1>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 lg:hidden"
          >
            <LogOut className="h-4 w-4" />
            Выход
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

