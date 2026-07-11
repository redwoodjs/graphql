import {
  Children,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { RequestInfo } from "rwsdk/worker";

import type { RouteDefinition } from "./compileRoutes.js";
import { resolveRouteCacheControl } from "./cacheControl.js";
import { normalizeRedwoodPath } from "./normalizePath.js";
import {
  Private,
  Route,
  Router,
  Set,
  type PrivateProps,
  type RouteProps,
  type RouterProps,
  type SetProps,
} from "./routeTree.js";
import { withLayout, type LayoutWithPathnameProps } from "./withLayout.js";

type RouteTreeContext = {
  readonly cacheControl?: string;
  readonly layoutWrapper?: ReturnType<typeof withLayout>;
  readonly private?: boolean;
  readonly unauthenticated?: string;
};

const isRouteElement = (element: ReactElement): element is ReactElement<RouteProps> =>
  element.type === Route;

const isSetElement = (element: ReactElement): element is ReactElement<SetProps> =>
  element.type === Set;

const isPrivateElement = (element: ReactElement): element is ReactElement<PrivateProps> =>
  element.type === Private;

const isRouterElement = (element: ReactElement): element is ReactElement<RouterProps> =>
  element.type === Router;

const resolveRouteDefinition = <T extends RequestInfo>(
  props: RouteProps<T>,
  context: RouteTreeContext,
): RouteDefinition<T> => {
  const isPrivate = props.private ?? context.private;
  const cacheControl = isPrivate
    ? undefined
    : resolveRouteCacheControl(props.cache, context.cacheControl);

  if (props.notfound) {
    if (!props.page && !props.render) {
      throw new Error("@rwgql/router: <Route notfound> requires page or render");
    }

    return {
      cacheControl,
      layoutWrapper: context.layoutWrapper,
      name: props.name ?? "notFound",
      page: props.page,
      path: "/*",
      private: isPrivate,
      render: props.render,
      unauthenticated: context.unauthenticated,
    };
  }

  if (!props.path) {
    throw new Error("@rwgql/router: <Route> requires path unless notfound is set");
  }

  if (!props.name) {
    throw new Error(
      `@rwgql/router: <Route path="${props.path}"> requires name unless notfound is set`,
    );
  }

  if (!props.page && !props.render) {
    throw new Error(`@rwgql/router: <Route name="${props.name}"> requires page or render`);
  }

  return {
    cacheControl,
    layoutWrapper: context.layoutWrapper,
    name: props.name,
    page: props.page,
    path: normalizeRedwoodPath(props.path),
    private: isPrivate,
    render: props.render,
    unauthenticated: context.unauthenticated,
  };
};

const walkRouteTree = <T extends RequestInfo>(
  node: ReactNode,
  context: RouteTreeContext,
  definitions: RouteDefinition<T>[],
) => {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (isRouterElement(child)) {
      walkRouteTree(child.props.children, context, definitions);
      return;
    }

    if (isSetElement(child)) {
      const { cache, children, wrap, ...layoutProps } = child.props;
      const cacheControl = resolveRouteCacheControl(cache, context.cacheControl);

      walkRouteTree(
        children,
        {
          ...context,
          cacheControl,
          layoutWrapper: withLayout(
            wrap as ComponentType<Record<string, unknown> & LayoutWithPathnameProps>,
            layoutProps,
          ),
        },
        definitions,
      );
      return;
    }

    if (isPrivateElement(child)) {
      walkRouteTree(
        child.props.children,
        {
          ...context,
          cacheControl: undefined,
          private: true,
          unauthenticated: child.props.unauthenticated,
        },
        definitions,
      );
      return;
    }

    if (!isRouteElement(child)) {
      throw new Error(
        "@rwgql/router: route trees may only contain <Router>, <Set>, <Private>, and <Route>",
      );
    }

    definitions.push(resolveRouteDefinition(child.props, context));
  });
};

export const buildRouteDefinitions = <T extends RequestInfo = RequestInfo>(
  tree: ReactNode,
): RouteDefinition<T>[] => {
  const definitions: RouteDefinition<T>[] = [];
  walkRouteTree(tree, {}, definitions);
  return definitions;
};
