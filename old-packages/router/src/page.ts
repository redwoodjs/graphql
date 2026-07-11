export interface Spec {
  name: string
  prerenderLoader: (name?: string) => { default: React.ComponentType<unknown> }
  LazyComponent:
    | React.LazyExoticComponent<React.ComponentType<unknown>>
    | React.ComponentType<unknown>
}

export function isSpec(
  specOrPage: Spec | React.ComponentType,
): specOrPage is Spec {
  return (specOrPage as Spec).LazyComponent !== undefined
}

/**
 * Pages can be imported automatically or manually. Automatic imports are actually
 * objects and take the following form (which we call a 'spec'):
 *
 *   const WhateverPage = {
 *     name: 'WhateverPage',
 *     LazyComponent: lazy(() => import('src/pages/WhateverPage'))
 *     prerenderLoader: ...
 *   }
 *
 * Manual imports simply load the page:
 *
 *   import WhateverPage from 'src/pages/WhateverPage'
 *
 * Before passing a "page" to the PageLoader, we will normalize the manually
 * imported version into a spec.
 */
export function normalizePage(
  specOrPage: Spec | React.ComponentType<unknown>,
): Spec {
  if (isSpec(specOrPage)) {
    // Already a spec, just return it.
    return specOrPage
  }

  // Wrap the Page in a fresh spec, and put it in a promise to emulate
  // an async module import.
  return {
    name: specOrPage.name,
    prerenderLoader: () => ({ default: specOrPage }),
    LazyComponent: specOrPage,
  }
}

export type PageType =
  | Spec
  | React.ComponentType<any>
  | ((props: any) => JSX.Element)
