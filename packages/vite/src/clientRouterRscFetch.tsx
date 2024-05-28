// TODO (RSC): This should live in @redwoodjs/router but I didn't want to add
// `react-server-dom-webpack` as a dependency there. We should first figure out
// what to do about rscFetch here vs renderFromRscServer and see if maybe that
// one should live somewhere else where @redwoodjs/router can import from

import type { Options } from 'react-server-dom-webpack/client'
import { createFromFetch, encodeReply } from 'react-server-dom-webpack/client'

const BASE_PATH = '/rw-rsc/'

const rscCache = new Map<string, Thenable<React.ReactElement>>()

export function rscFetch(rscId: string, props: Record<string, unknown>) {
  const serializedProps = JSON.stringify(props)

  const cached = rscCache.get(serializedProps)
  if (cached) {
    return cached
  }

  const searchParams = new URLSearchParams()
  searchParams.set('props', serializedProps)

  // TODO (RSC): During SSR we should not fetch (Is this function really
  // called during SSR?)
  const response = fetch(
    (props.location as any).origin + BASE_PATH + rscId + '?' + searchParams,
    {
      headers: {
        'rw-rsc': '1',
      },
    },
  )

  const options: Options<unknown[], React.ReactElement> = {
    // React will hold on to `callServer` and use that when it detects a
    // server action is invoked (like `action={onSubmit}` in a <form>
    // element). So for now at least we need to send it with every RSC
    // request, so React knows what `callServer` method to use for server
    // actions inside the RSC.
    callServer: async function (rsfId: string, args: unknown[]) {
      // `args` is often going to be an array with just a single element,
      // and that element will be FormData
      console.log('ClientRouter.ts :: callServer rsfId', rsfId, 'args', args)

      const searchParams = new URLSearchParams()
      searchParams.set('action_id', rsfId)
      const id = '_'

      const response = fetch(BASE_PATH + id + '?' + searchParams, {
        method: 'POST',
        body: await encodeReply(args),
        headers: {
          'rw-rsc': '1',
        },
      })

      // I'm not sure this recursive use of `options` is needed. I briefly
      // tried without it, and things seemed to work. But keeping it for
      // now, until we learn more.
      const data = createFromFetch(response, options)

      return data
    },
  }

  const componentPromise = createFromFetch<never, React.ReactElement>(
    response,
    options,
  )
  rscCache.set(serializedProps, componentPromise)

  return componentPromise
}
