import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Outlet, useMatch } from "react-router-dom";
import { useState, type ReactNode } from "react";

// Context type for children to set the Header's right slot
export type LayoutOutletContext = { setHeaderRightSlot: (node?: ReactNode) => void };

export default function DefaultLayout() {
  const isEditor = !!useMatch("/paginas/:id");
  const [headerRightSlot, setHeaderRightSlot] = useState<ReactNode>();

  return (
    <div className="relative flex flex-col h-screen">
      <Header collapsedSidebar={isEditor} rightSlot={headerRightSlot} />
      <main className="container mx-auto max-w-7xl flex flex-row flex-grow">
        {!isEditor && <Sidebar />}
        <div className={isEditor ? "w-full" : "w-10/12"}>
          <Outlet context={{ setHeaderRightSlot }} />
        </div>
      </main>
    </div>
  );
}
