import { Link } from "@heroui/link";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/breadcrumbs";
import { Navbar, NavbarBrand, NavbarContent } from "@heroui/navbar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Logo } from "@/components/icons";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

export const Header = ({ collapsedSidebar = false }: { collapsedSidebar?: boolean }) => {
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const segments = currentPath.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  let acc = "";
  segments.forEach((seg) => {
    acc += `/${seg}`;
    const match = siteConfig.navItems.find((n) => n.href === acc);
    const label = match ? match.label : seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: acc });
  });

  return (
    <Navbar maxWidth="xl" position="sticky" isBordered>
      {collapsedSidebar && (
        <NavbarContent className="basis-auto max-w-[100px]">
          <Dropdown>
            <DropdownTrigger>
              <Button size="sm" variant="ghost">Menú</Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Menú de navegación">
              {siteConfig.navItems.map((item) => (
                <DropdownItem key={item.href} textValue={item.label}>
                  <Link color="foreground" href={item.href}>{item.label}</Link>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      )}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link className="flex justify-start items-center gap-1" color="foreground" href="/">
            <Logo />
            <p className="font-bold text-inherit">L&D</p>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      {/* <NavbarContent className="basis-4/5 sm:basis-full" justify="start">
        <Breadcrumbs>
          {crumbs.map((c) => (
            <BreadcrumbItem key={c.href} href={c.href}>
              {c.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumbs>
      </NavbarContent> */}
    </Navbar>
  );
};
