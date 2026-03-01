import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserStore } from '@/stores/userStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { User, Heart, FileText, Package, ArrowLeftRight, Bell, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const { theme, setTheme, tradeInApplications, contactRequests } = useUserStore();
  const favCount = useFavoritesStore((s) => s.ids.length);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  }, [theme]);

  const sections = [
    { icon: Heart, label: 'Избранное', count: favCount, onClick: () => navigate('/favorites') },
    { icon: FileText, label: 'Мои заявки', count: contactRequests.length, onClick: () => {} },
    { icon: Package, label: 'Статус заказов', onClick: () => {} },
    { icon: ArrowLeftRight, label: 'Trade-In заявки', count: tradeInApplications.length, onClick: () => navigate('/trade-in') },
    { icon: Bell, label: 'Уведомления', onClick: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="h-14 flex items-center px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Профиль</h1>
        </div>
      </div>

      <div className="pt-16 max-w-lg mx-auto px-4 py-4">
        {/* User info */}
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-semibold">
              {user ? `${user.first_name} ${user.last_name ?? ''}`.trim() : 'Пользователь'}
            </p>
            {user?.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
          </div>
        </div>

        {/* Menu */}
        <div className="mt-4 bg-card rounded-xl border overflow-hidden">
          {sections.map(({ icon: Icon, label, count, onClick }, i) => (
            <button
              key={label}
              onClick={onClick}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3.5 text-sm transition-colors hover:bg-accent',
                i !== sections.length - 1 && 'border-b'
              )}
            >
              <Icon className="w-4.5 h-4.5 text-muted-foreground" />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Theme */}
        <div className="mt-4 bg-card rounded-xl border p-4">
          <p className="text-sm font-medium mb-3">Тема</p>
          <div className="flex gap-2">
            {[
              { value: 'light' as const, icon: Sun, label: 'Светлая' },
              { value: 'dark' as const, icon: Moon, label: 'Тёмная' },
              { value: 'auto' as const, icon: Monitor, label: 'Авто' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all',
                  theme === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
