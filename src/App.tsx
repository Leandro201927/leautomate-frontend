import { Route, Routes } from "react-router-dom";
import PaginasPage from "@/pages/paginas/paginas";
import SeguridadPage from "./pages/seguridad/seguridad";
import MarketingPage from "./pages/marketing/marketing";

function App() {
  return (
    <Routes>
      <Route element={<PaginasPage />} path="/" />
      <Route element={<PaginasPage />} path="/paginas" />
      <Route element={<MarketingPage />} path="/marketing" />
      <Route element={<SeguridadPage />} path="/seguridad" />
    </Routes>
  );
}

export default App;
