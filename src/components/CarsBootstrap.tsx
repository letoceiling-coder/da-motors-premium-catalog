import { useEffect } from "react";
import { useCarsStore } from "@/stores/carsStore";

export function CarsBootstrap() {
  const loadCars = useCarsStore((s) => s.loadCars);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  return null;
}

