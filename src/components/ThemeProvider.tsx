import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUserStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // auto - используем системную тему
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  }, [theme]);

  return <>{children}</>;
}
