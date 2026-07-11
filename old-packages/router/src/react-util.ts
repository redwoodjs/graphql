import type { ReactNode } from 'react'
import { Children, isValidElement } from 'react'

export function flattenAll(children: ReactNode): ReactNode[] {
  const childrenArray = Children.toArray(children)

  return childrenArray.flatMap((child) => {
    if (isValidElement(child) && child.props.children) {
      return [child, ...flattenAll(child.props.children)]
    }

    return [child]
  })
}
