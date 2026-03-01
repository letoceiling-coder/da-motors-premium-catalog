import { NavLink, useLocation } from 'react-router-dom';
import { Search, Heart, Car, User, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/favoritesStore';

const tabs = [
  { to: '/', icon: Car, label: 'Каталог' },
  { to: '/search', icon: Search, label: 'Поиск' },
  { to: '/favorites', icon: Heart, label: 'Избранное' },
  { to: '/trade-in', icon: ArrowLeftRight, label: 'Trade-In' },
  { to: '/profile', icon: User, label: 'Профиль' },
];

export function BottomNav() {
  const location = useLocation();
  const favCount = useFavoritesStore((s) => s.ids.length);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors relative',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                {to === '/favorites' && favCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {favCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
