import {
  Children,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { RequestInfo } from "rwsdk/worker";

import { normalizeRedwoodPath } from "./normalizePath.js";
import type { CacheOption } from "./cacheControl.js";

export type RouteRender<T extends RequestInfo = RequestInfo> = (requestInfo: T) => ReactNode;

export type RouteProps<T extends RequestInfo = RequestInfo> = {
  readonly cache?: CacheOption;
  readonly children?: never;
  readonly name?: string;
  readonly notfound?: boolean;
  readonly page?: ComponentType<any>;
  readonly path?: string;
  readonly private?: boolean;
  readonly render?: RouteRender<T>;
};

export type SetProps = {
  readonly cache?: CacheOption;
  readonly children: ReactNode;
  readonly wrap: ComponentType<any>;
  readonly [prop: string]: unknown;
};

export type PrivateProps = {
  readonly children: ReactNode;
  readonly unauthenticated: string;
};

export type RouterProps = {
  readonly children: ReactNode;
};

export const Route = <T extends RequestInfo = RequestInfo>(_props: RouteProps<T>) => null;

export const Set = (_props: SetProps) => null;

export const Private = (_props: PrivateProps) => null;

export const Router = (_props: RouterProps) => null;

const isRouteElement = (element: ReactElement): element is ReactElement<RouteProps> =>
  element.type === Route;

const isSetElement = (element: ReactElement): element is ReactElement<SetProps> =>
  element.type === Set;

const isPrivateElement = (element: ReactElement): element is ReactElement<PrivateProps> =>
  element.type === Private;

const isRouterElement = (element: ReactElement): element is ReactElement<RouterProps> =>
  element.type === Router;

export const routeNamesFromTree = (tree: ReactNode) => {
  const names: Array<{
    name: string;
    path: string;
    private?: boolean;
    unauthenticated?: string;
  }> = [];

  const walk = (node: ReactNode, context: { private?: boolean; unauthenticated?: string }) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) {
        return;
      }

      if (isRouterElement(child) || isSetElement(child)) {
        walk(child.props.children, context);
        return;
      }

      if (isPrivateElement(child)) {
        walk(child.props.children, {
          private: true,
          unauthenticated: child.props.unauthenticated,
        });
        return;
      }

      if (!isRouteElement(child)) {
        return;
      }

      const props = child.props;
      if (props.notfound) {
        names.push({
          name: props.name ?? "notFound",
          path: "/*",
          private: props.private ?? context.private,
          unauthenticated: context.unauthenticated,
        });
        return;
      }

      if (!props.path || !props.name) {
        return;
      }

      names.push({
        name: props.name,
        path: normalizeRedwoodPath(props.path),
        private: props.private ?? context.private,
        unauthenticated: context.unauthenticated,
      });
    });
  };

  walk(tree, {});
  return names;
};
