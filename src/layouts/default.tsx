import { Link } from "@heroui/link";

import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col h-screen">
      <Header />
      <main className="container mx-auto max-w-7xl flex-grow">
          <Sidebar />
          <div className="w-10/12">{children}</div>
      </main>
    </div>
  );
}
