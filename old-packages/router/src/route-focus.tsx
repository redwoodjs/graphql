import React from 'react'

/**
 * this initial implementation borrows (heavily!) from madalyn's great work at gatsby:
 * - issue: https://github.com/gatsbyjs/gatsby/issues/21059
 * - PR: https://github.com/gatsbyjs/gatsby/pull/26376
 */
const RouteFocus: React.FC<RouteFocusProps> = ({ children, ...props }) => (
  <div {...props} data-redwood-route-focus={true}>
    {children}
  </div>
)

export interface RouteFocusProps {
  children: React.ReactNode
}

export default RouteFocus
