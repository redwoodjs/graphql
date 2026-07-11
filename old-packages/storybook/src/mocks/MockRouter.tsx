/*
 * We use a Vite plugin to swap out imports from `@redwoodjs/router` to this
 * file. See ../plugins/mock-router.ts
 *
 * It's therefore important to reexport everything that we *don't* want to mock.
 */

import type React from 'react'

import { flattenAll } from '@redwoodjs/router/dist/react-util'
import { isValidRoute } from '@redwoodjs/router/dist/route-validators'
import type { RouterProps } from '@redwoodjs/router/dist/router'
import { replaceParams } from '@redwoodjs/router/dist/util'

export * from '@redwoodjs/router/dist/index'

export const routes: { [routeName: string]: () => string } = {}

/**
 * This router populates the `routes.<pageName>()` utility object.
 */
export const Router: React.FC<RouterProps> = ({ children }) => {
  const flatChildArray = flattenAll(children)

  flatChildArray.forEach((child) => {
    if (isValidRoute(child)) {
      const { name, path } = child.props

      if (name && path) {
        routes[name] = (args = {}) => replaceParams(path, args)
      }
    }
  })

  return null
}
