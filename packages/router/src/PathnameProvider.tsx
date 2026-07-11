"use client";

import { createContext, useContext, type ReactNode } from "react";

import { normalizePathname } from "./normalizePath.js";

const PathnameContext = createContext<string | undefined>(undefined);

export type PathnameProviderProps = {
  readonly children: ReactNode;
  readonly pathname?: string;
};

export const PathnameProvider = ({ children, pathname }: PathnameProviderProps) => (
  <PathnameContext.Provider value={pathname}>{children}</PathnameContext.Provider>
);

export const usePathname = (): string => {
  const fromProvider = useContext(PathnameContext);

  if (fromProvider !== undefined) {
    return normalizePathname(fromProvider);
  }

  if (typeof window !== "undefined") {
    return normalizePathname(window.location.pathname);
  }

  return "/";
};
