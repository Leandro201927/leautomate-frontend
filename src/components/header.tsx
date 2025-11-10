import { Link } from "@heroui/link";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/breadcrumbs";
import { Navbar, NavbarBrand, NavbarContent } from "@heroui/navbar";
import { Logo } from "@/components/icons";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

export const Header = () => {
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
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link className="flex justify-start items-center gap-1" color="foreground" href="/">
            <Logo />
            <p className="font-bold text-inherit">L&D</p>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="basis-4/5 sm:basis-full" justify="start">
        <Breadcrumbs>
          {crumbs.map((c) => (
            <BreadcrumbItem key={c.href} href={c.href}>
              {c.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumbs>
      </NavbarContent>
    </Navbar>
  );
};
