import { Navigate, Route, Routes } from "react-router-dom";
import PremiumLayout from "./layouts/PremiumLayout";
import PremiumHome from "./pages/PremiumHome";
import PremiumCatalog from "./pages/PremiumCatalog";
import PremiumCarPage from "./pages/PremiumCarPage";

const PremiumApp = () => {
  console.log("PremiumApp rendered");
  return (
    <Routes>
      <Route element={<PremiumLayout />}>
        <Route index element={<PremiumHome />} />
        <Route path="catalog" element={<PremiumCatalog />} />
        <Route path="car/:id" element={<PremiumCarPage />} />
        <Route path="*" element={<Navigate to="/premium" replace />} />
      </Route>
    </Routes>
  );
};

export default PremiumApp;
