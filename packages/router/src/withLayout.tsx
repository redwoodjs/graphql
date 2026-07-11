import type { ComponentType, ReactNode } from "react";
import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

export type LayoutWrapper = (children: ReactNode, requestInfo: RequestInfo) => ReactNode;

export type LayoutWithPathnameProps = {
  readonly children?: ReactNode;
  readonly pathname?: string;
};

export const withLayout = <P extends Record<string, unknown>>(
  Layout: ComponentType<P & LayoutWithPathnameProps>,
  layoutProps: P,
): LayoutWrapper => {
  const WrappedLayout = ({ children, requestInfo }: LayoutProps) => (
    <Layout {...layoutProps} pathname={requestInfo?.path}>
      {children}
    </Layout>
  );

  return (children, requestInfo) => (
    <WrappedLayout requestInfo={requestInfo}>{children}</WrappedLayout>
  );
};
