import "./styles/index.scss";
import { Route, Routes } from "react-router-dom";
import PaginasPage from "@/pages/paginas/paginas";
import SeguridadPage from "./pages/seguridad/seguridad";
import MarketingPage from "./pages/marketing/marketing";
import ComponentesPage from "./pages/componentes/componentes";
import DefaultLayout from "./layouts/default";
import PaginaEditPage from "./pages/paginas/edit/paginasEdit";
import BibliotecaPage from "./pages/biblioteca/biblioteca";

function App() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<PaginasPage />} />
        <Route path="/paginas" element={<PaginasPage />} />
        <Route path="/biblioteca" element={<BibliotecaPage />} />
        <Route path="/marketing" element={<MarketingPage />} />
        <Route path="/seguridad" element={<SeguridadPage />} />
        <Route path="/componentes" element={<ComponentesPage />} />
        <Route path="/paginas/:id" element={<PaginaEditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
