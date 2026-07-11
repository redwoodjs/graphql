import React from 'react'
import type { ReactElement } from 'react'

import type { PageType } from './page.js'

export type RenderMode = 'stream' | 'html'

export interface RedirectRouteProps {
  redirect: string
  path: string
  name?: string
}

export interface NotFoundRouteProps {
  notfound: boolean
  page: PageType
  prerender?: boolean
  renderMode?: RenderMode
}

export interface RouteProps {
  path: string
  page: PageType
  name: string
  prerender?: boolean
  renderMode?: RenderMode
  whileLoadingPage?: () => ReactElement | null
}

export type InternalRouteProps = Partial<
  RouteProps & RedirectRouteProps & NotFoundRouteProps
>

/**
 * Route is now a "virtual" component
 * it is actually never rendered. All the page loading logic happens in active-route-loader
 * and all the validation happens within utility functions called from the Router
 */
export function Route(props: RouteProps): JSX.Element
export function Route(props: RedirectRouteProps): JSX.Element
export function Route(props: NotFoundRouteProps): JSX.Element
export function Route(
  _props: RouteProps | RedirectRouteProps | NotFoundRouteProps,
) {
  return <></>
}
