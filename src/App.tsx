import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { MainShell } from "@/MainShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CarsBootstrap } from "@/components/CarsBootstrap";

const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const CarDetailPage = lazy(() => import("./pages/CarDetailPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const TradeInPage = lazy(() => import("./pages/TradeInPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PremiumApp = lazy(() => import("./premium/PremiumApp"));
const AdminApp = lazy(() => import("./admin/AdminApp"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <CarsBootstrap />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/premium/*" element={<PremiumApp />} />
              <Route path="/*" element={<MainShell />}>
                <Route index element={<CatalogPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="car/:id" element={<CarDetailPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="trade-in" element={<TradeInPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
