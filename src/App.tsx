import { Route, Routes } from "react-router-dom";
import PaginasPage from "@/pages/paginas/paginas";
import SeguridadPage from "./pages/seguridad/seguridad";
import MarketingPage from "./pages/marketing/marketing";
import ComponentesPage from "./pages/componentes/componentes";
import DefaultLayout from "./layouts/default";
import { siteConfig } from "@/config/site";

function App() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        {/* Ruta index basada en el primer navItem */}
        <Route
          index
          element={
            {
              "/paginas": <PaginasPage />,
              "/marketing": <MarketingPage />,
              "/seguridad": <SeguridadPage />,
              "/componentes": <ComponentesPage />,
            }[siteConfig.navItems[0]?.href] || <PaginasPage />
          }
        />
        {siteConfig.navItems.map((item) => {
          const element =
            {
              "/paginas": <PaginasPage />,
              "/marketing": <MarketingPage />,
              "/seguridad": <SeguridadPage />,
              "/componentes": <ComponentesPage />,
            }[item.href];
          return element ? (
            <Route key={item.href} path={item.href} element={element} />
          ) : null;
        })}
      </Route>
    </Routes>
  );
}

export default App;
