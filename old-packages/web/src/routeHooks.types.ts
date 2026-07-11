import type { TagDescriptor } from './components/htmlTags.js'

export type RouteHookOutput = {
  meta: TagDescriptor[]
}
export interface RouteHookEvent {
  params: Record<string, string> // this has to be provided from RW router
  headers: Headers
  query: Record<string, string | string[] | undefined>
  // cookies: Record<string, string> TODO (STREAMING) pass in parsed cookies
  // TODO (STREAMING) this is the previous output, but we call it appRouteHook, we should rename it
  appRouteHook?: RouteHookOutput
}

export type MetaHook = (
  event: RouteHookEvent,
) => Promise<TagDescriptor[] | TagDescriptor> | TagDescriptor[] | TagDescriptor
