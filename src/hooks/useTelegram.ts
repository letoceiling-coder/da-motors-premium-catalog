import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try { tg?.HapticFeedback?.impactOccurred(type); } catch {}
  };

  const selectionHaptic = () => {
    try { tg?.HapticFeedback?.selectionChanged(); } catch {}
  };

  return {
    tg,
    user: tg?.initDataUnsafe?.user ?? null,
    colorScheme: tg?.colorScheme ?? 'light',
    haptic,
    selectionHaptic,
  };
}
