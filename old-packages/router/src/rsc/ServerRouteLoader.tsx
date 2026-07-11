import React, { Suspense } from 'react'

import type { Spec } from '../page.js'

interface Props {
  path: string
  spec: Spec
  params?: Record<string, string>
  whileLoadingPage?: () => React.ReactNode | null
  children?: React.ReactNode
}

export const ServerRouteLoader = ({ spec, params }: Props) => {
  const LazyRouteComponent = spec.LazyComponent

  // Delete params ref & key so that they are not spread on to the component
  if (params) {
    delete params['ref']
    delete params['key']
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyRouteComponent {...params} />
      <div
        id="redwood-announcer"
        style={{
          position: 'absolute',
          top: 0,
          width: 1,
          height: 1,
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      ></div>
    </Suspense>
  )
}
