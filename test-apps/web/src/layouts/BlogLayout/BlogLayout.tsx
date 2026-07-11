"use client";

import { Link, NavLink, PathnameProvider } from "@rwgql/router";
import { routes } from "@/routes";

import { useAuth } from "@/auth";

type BlogLayoutProps = {
  children?: React.ReactNode;
  pathname?: string;
};

const BlogLayout = ({ children, pathname }: BlogLayoutProps) => {
  const { logOut, isAuthenticated } = useAuth();

  return (
    <PathnameProvider pathname={pathname}>
      <>
        <header className="relative flex items-center justify-between bg-blue-700 px-8 py-4 text-white">
          <h1 className="text-3xl font-semibold tracking-tight">
            <Link
              className="text-blue-400 transition duration-100 hover:text-blue-100"
              to={routes.home()}
            >
              Redwood Blog
            </Link>
          </h1>
          <nav>
            <ul className="relative flex items-center font-light">
              <li>
                <NavLink
                  className="rounded px-4 py-2 transition duration-100 hover:bg-blue-600"
                  activeClassName="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded underline underline-offset-4"
                  to={routes.about()}
                >
                  About
                </NavLink>
              </li>
              <li>
                <NavLink
                  className="rounded px-4 py-2 transition duration-100 hover:bg-blue-600"
                  activeClassName="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded underline underline-offset-4"
                  to={routes.contactUs()}
                >
                  Contact Us
                </NavLink>
              </li>
              <li>
                <NavLink
                  className="rounded px-4 py-2 transition duration-100 hover:bg-blue-600"
                  activeClassName="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded underline underline-offset-4"
                  to={routes.posts()}
                >
                  Admin
                </NavLink>
              </li>
              {isAuthenticated && (
                <li>
                  <NavLink
                    className="rounded px-4 py-2 transition duration-100 hover:bg-blue-600"
                    activeClassName="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded underline underline-offset-4"
                    onClick={logOut}
                    to={""}
                  >
                    Log Out
                  </NavLink>
                </li>
              )}
              {!isAuthenticated && (
                <li>
                  <NavLink
                    className="rounded px-4 py-2 transition duration-100 hover:bg-blue-600"
                    activeClassName="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded underline underline-offset-4"
                    to={routes.login()}
                  >
                    Log In
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
        </header>
        <main className="mx-auto mt-3 max-w-4xl rounded-b bg-white p-12 shadow-lg">{children}</main>
      </>
    </PathnameProvider>
  );
};

export default BlogLayout;
