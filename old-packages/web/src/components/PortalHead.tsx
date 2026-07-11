import React from 'react'

import { createPortal } from 'react-dom'

import { useServerInsertedHTML } from './ServerInject.js'

function addDataAttributeMarker(
  children: React.ReactNode,
  marker = 'data-rwjs-head',
) {
  return React.Children.toArray(children).map((child, i) => {
    return React.cloneElement(child as React.ReactElement, {
      [marker]: true,
      key: `${marker}-` + i,
    })
  })
}

const PortalHead: React.FC<React.PropsWithChildren> = ({ children }) => {
  const isServerRendering = typeof window === 'undefined'

  useServerInsertedHTML(() => {
    // Add "data-rwjs-head" attribute to anything inside <PortalHead>,
    // This is then later moved to the <head> in the final block of the transform stream (see streamHelpers.ts)
    return addDataAttributeMarker(children)
  })

  // shouldPortal is always false on hard render. Because we use a ref,
  // the value change is not detected by React and the component is not re-rendered (intentionally)
  // On a soft render, the value is always true. This is all to prevent double rendering of the head elements.

  // @TODO
  // There is an edgecase: if you change the children inside <PortalHead> after a hard render, it will not be reflected.
  // Workaround: don't change children, render a new portal head: x ? <PH>aaa</PH> : <PH>bbb</PH>
  // we may want to look at using a callback ref: https://shrtm.nu/gMx
  const shouldPortal = React.useRef(
    isServerRendering ? false : document.readyState === 'complete',
  )

  if (isServerRendering) {
    // Don't do anything on the server, handled by useServerInsertedHTML
    return null
  } else {
    // On hard render, don't do anything on the client. On soft render, portal to <head>
    return shouldPortal.current ? createPortal(children, document.head) : null
  }
}

export default PortalHead
