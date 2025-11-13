import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Outlet, useMatch } from "react-router-dom";
import { useState, type ReactNode } from "react";

// Context type for children to set the Header's right slot and layout width mode
export type LayoutOutletContext = {
  setHeaderRightSlot: (node?: ReactNode) => void;
  setWidthToFullViewport: (full: boolean) => void;
};

export default function DefaultLayout() {
  const isEditor = !!useMatch("/paginas/:id");
  const [headerRightSlot, setHeaderRightSlot] = useState<ReactNode>();
  const [widthToFullViewport, setWidthToFullViewport] = useState<boolean>(false);

  return (
    <div className="relative flex flex-col h-screen">
      <Header collapsedSidebar={isEditor} rightSlot={headerRightSlot} fullViewport={widthToFullViewport} />
      <main className={(widthToFullViewport ? "w-full px-0" : "container mx-auto max-w-7xl") + " flex flex-row flex-grow"}>
        {!isEditor && <Sidebar />}
        <div className={isEditor ? "w-full" : "w-10/12"}>
          <Outlet context={{ setHeaderRightSlot, setWidthToFullViewport }} />
        </div>
      </main>
    </div>
  );
}
