/**
 * gets the announcement for the new page.
 * called in one of active-route-loader's `useEffect`.
 *
 * the order of priority is:
 * 1. RouteAnnouncement (the most specific one)
 * 2. h1
 * 3. document.title
 * 4. location.pathname
 */
export const getAnnouncement = () => {
  const routeAnnouncement = globalThis?.document.querySelectorAll(
    '[data-redwood-route-announcement]',
  )?.[0]
  if (routeAnnouncement?.textContent) {
    return routeAnnouncement.textContent
  }

  const pageHeading = globalThis?.document.querySelector(`h1`)
  if (pageHeading?.textContent) {
    return pageHeading.textContent
  }

  if (globalThis?.document.title) {
    return document.title
  }

  return `new page at ${globalThis?.location.pathname}`
}

export const getFocus = () => {
  const routeFocus = globalThis?.document.querySelectorAll(
    '[data-redwood-route-focus]',
  )?.[0]

  if (
    !routeFocus?.children.length ||
    (routeFocus.children[0] as HTMLElement).tabIndex < 0
  ) {
    return null
  }

  return routeFocus.children[0] as HTMLElement
}

// note: tried document.activeElement.blur(), but that didn't reset the focus flow
export const resetFocus = () => {
  globalThis?.document.body.setAttribute('tabindex', '-1')
  globalThis?.document.body.focus()
  globalThis?.document.body.removeAttribute('tabindex')
}
