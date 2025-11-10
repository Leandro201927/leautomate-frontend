import { Button, Link } from "@heroui/react";
import { Logo } from "./icons";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

export default function Sidebar() {
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    setCurrentPage(window.location.pathname);
  }, []);

  console.log(currentPage);
  
  return (
    <div className="w-2/12 h-full border-r border-r-foreground/10 pt-8">
      <Navbar className="flex-col items-start p-0">
        <NavbarContent className="flex-col items-start p-0" justify="start">
          {siteConfig.navItems.map((item) => {
            const isActive = currentPage === item.href || (item.href === "/paginas" && currentPage === "/");
            return (
              <NavbarItem key={item.href} className="justify-start p-0" isActive={isActive}>
                <Link className="p-0" color="foreground" href={item.href}>
                  {item.label}
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>
      </Navbar>
    </div>
  );
}
