import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Outlet, useMatch } from "react-router-dom";

export default function DefaultLayout() {
  const isEditor = !!useMatch("/paginas/:id");

  return (
    <div className="relative flex flex-col h-screen">
      <Header collapsedSidebar={isEditor} />
      <main className="container mx-auto max-w-7xl flex flex-row flex-grow">
        {!isEditor && <Sidebar />}
        <div className={isEditor ? "w-full" : "w-10/12"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
