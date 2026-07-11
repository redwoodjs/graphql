"use client";

import { Link } from "@rwgql/router";
import { routes, type WebRouteName } from "@/routes";
import { Toaster } from "react-hot-toast";

type ScaffoldTitleTo = Extract<WebRouteName, "contacts" | "posts">;
type ScaffoldButtonTo = Extract<WebRouteName, "newContact" | "newPost">;

type LayoutProps = {
  title: string;
  titleTo: ScaffoldTitleTo;
  buttonLabel: string;
  buttonTo: ScaffoldButtonTo;
  children?: React.ReactNode;
  pathname?: string;
};

const ScaffoldLayout = ({ title, titleTo, buttonLabel, buttonTo, children }: LayoutProps) => {
  return (
    <div className="rw-scaffold">
      <Toaster toastOptions={{ className: "rw-toast", duration: 6000 }} />
      <header className="rw-header">
        <h1 className="rw-heading rw-heading-primary">
          <Link to={routes[titleTo]()} className="rw-link">
            {title}
          </Link>
        </h1>
        <Link to={routes[buttonTo]()} className="rw-button rw-button-green">
          <div className="rw-button-icon">+</div> {buttonLabel}
        </Link>
      </header>
      <main className="rw-main">{children}</main>
    </div>
  );
};

export default ScaffoldLayout;
