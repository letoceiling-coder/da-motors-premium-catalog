import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AIAssistant } from "@/components/AIAssistant";

const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const CarDetailPage = lazy(() => import("./pages/CarDetailPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const TradeInPage = lazy(() => import("./pages/TradeInPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/car/:id" element={<CarDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/trade-in" element={<TradeInPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <AIAssistant />
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
