import type { ReactElement, ReactNode } from 'react'
import React from 'react'

export type WrapperType<WTProps> = (
  props: Omit<WTProps, 'wrap' | 'children'> & {
    children: ReactNode
  },
) => ReactElement | null

type SetProps<P> = P & {
  /**
   * P is the interface for the props that are forwarded to the wrapper
   * components. TypeScript will most likely infer this for you, but if you
   * need to you can specify it yourself in your JSX like so:
   *   <Set<{theme: string}> wrap={ThemableLayout} theme="dark">
   */
  wrap?: WrapperType<P> | WrapperType<P>[]
  /**
   *`Routes` nested in a `<Set>` with `private` specified require
   * authentication. When a user is not authenticated and attempts to visit
   * the wrapped route they will be redirected to `unauthenticated` route.
   *
   * @deprecated Please use `<PrivateSet>` instead
   */
  private?: boolean
  /**
   * The page name where a user will be redirected when not authenticated
   *
   * @deprecated Please use `<PrivateSet>` instead and specify this prop there
   */
  unauthenticated?: string
  /**
   * Route is permitted when authenticated and user has any of the provided
   * roles such as "admin" or ["admin", "editor"]
   */
  roles?: string | string[]
  /** Prerender all pages in the set */
  prerender?: boolean
  children: ReactNode
  /** Loading state for auth to distinguish with whileLoading */
  whileLoadingAuth?: () => ReactElement | null
  whileLoadingPage?: () => ReactElement | null
}

/**
 * TypeScript will often infer the type of the props you can forward to the
 * wrappers for you, but if you need to you can specify it yourself in your
 * JSX like so:
 *   <Set<{theme: string}> wrap={ThemeableLayout} theme="dark">
 */
export function Set<WrapperProps>(props: SetProps<WrapperProps>) {
  // @MARK: Virtual Component, this is actually never rendered
  // See analyzeRoutes in utils.tsx, inside the isSetNode block
  return <>{props.children}</>
}

type PrivateSetProps<P> = P &
  Omit<SetProps<P>, 'private' | 'unauthenticated'> & {
    /** The page name where a user will be redirected when not authenticated */
    unauthenticated: string
  }

/** @deprecated Please use `<PrivateSet>` instead */
export function Private<WrapperProps>(props: PrivateSetProps<WrapperProps>) {
  // @MARK Virtual Component, this is actually never rendered
  // See analyzeRoutes in utils.tsx, inside the isSetNode block
  return <>{props.children}</>
}

export function PrivateSet<WrapperProps>(props: PrivateSetProps<WrapperProps>) {
  // @MARK Virtual Component, this is actually never rendered
  // See analyzeRoutes in utils.tsx, inside the isSetNode block
  return <>{props.children}</>
}

export const isSetNode = (
  node: ReactNode,
): node is ReactElement<SetProps<any>> => {
  return (
    React.isValidElement(node) &&
    (node.type === Set || node.type === PrivateSet || node.type === Private) &&
    // Don't even bother including Sets without children. They're useless.
    node.props.children
  )
}

export const isPrivateSetNode = (
  node: ReactNode,
): node is ReactElement<PrivateSetProps<unknown>> => {
  return React.isValidElement(node) && node.type === PrivateSet
}

// Only identifies <Private> nodes, not <Set private> nodes
export const isPrivateNode = (
  node: ReactNode,
): node is ReactElement<SetProps<any>> => {
  return React.isValidElement(node) && node.type === Private
}
