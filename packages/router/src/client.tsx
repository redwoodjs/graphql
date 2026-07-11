"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate as rwsdkNavigate } from "rwsdk/client";

import { usePathname } from "./PathnameProvider.js";
import { normalizePathname } from "./normalizePath.js";

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  readonly children: ReactNode;
  readonly to: string;
};

export const Link = ({ to, children, ...props }: LinkProps) => (
  <a href={to} {...props}>
    {children}
  </a>
);

export type NavLinkProps = LinkProps & {
  readonly activeClassName?: string;
};

export const NavLink = ({ activeClassName, className, to, ...props }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === normalizePathname(to);

  return (
    <Link className={isActive ? (activeClassName ?? className) : className} to={to} {...props} />
  );
};

export const navigate = (to: string) => {
  void rwsdkNavigate(to);
};

export type BlockerState = "BLOCKED" | "IDLE" | "PROCEEDING";

/** PoC stub until a real navigation blocker is implemented for RWSdk. */
export const useBlocker = (_options: { readonly when: boolean }) => ({
  abort: () => undefined,
  confirm: () => undefined,
  state: "IDLE" as BlockerState,
});
