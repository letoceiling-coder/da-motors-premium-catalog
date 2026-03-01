import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (t: 'light' | 'dark' | 'auto') => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  tradeInApplications: TradeInApplication[];
  addTradeIn: (app: TradeInApplication) => void;
  contactRequests: ContactRequest[];
  addContactRequest: (req: ContactRequest) => void;
}

export interface TradeInApplication {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  vin: string;
  phone: string;
  status: 'pending' | 'reviewed' | 'completed';
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  carId: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      theme: 'auto',
      setTheme: (theme) => set({ theme }),
      recentSearches: [],
      addRecentSearch: (q) => {
        const current = get().recentSearches.filter((s) => s !== q);
        set({ recentSearches: [q, ...current].slice(0, 10) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
      tradeInApplications: [],
      addTradeIn: (app) => set((s) => ({ tradeInApplications: [app, ...s.tradeInApplications] })),
      contactRequests: [],
      addContactRequest: (req) => set((s) => ({ contactRequests: [req, ...s.contactRequests] })),
    }),
    { name: 'da-motors-user' }
  )
);
