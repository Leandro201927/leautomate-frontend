import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Outlet } from "react-router-dom";

export default function DefaultLayout() {
  return (
    <div className="relative flex flex-col h-screen">
      <Header />
      <main className="container mx-auto max-w-7xl flex flex-row flex-grow">
        <Sidebar />
        <div className="w-10/12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
