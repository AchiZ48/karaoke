"use client";
import React from "react";
import { usePathname } from "next/navigation";

// Centralized content wrapper that adds top padding to offset the fixed Navbar.
// By default, it applies a top padding roughly equal to the Navbar height.
// Opt-out for landing/hero pages by listing their routes in noOffsetRoutes.
export default function PageFrame({ children }) {
  const pathname = usePathname();
  const noOffsetRoutes = new Set(["/"]); // add more like '/welcome' if desired
  const needOffset = !noOffsetRoutes.has(pathname || "/");

  return <div>{children}</div>;
}
