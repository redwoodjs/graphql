import React from 'react'

/**
 * this initial implementation borrows (heavily!) from madalyn's great work at gatsby:
 * - issue: https://github.com/gatsbyjs/gatsby/issues/21059
 * - PR: https://github.com/gatsbyjs/gatsby/pull/26376
 */
const RouteAnnouncement: React.FC<RouteAnnouncementProps> = ({
  children,
  visuallyHidden = false,
  ...props
}) => {
  const hiddenStyle: React.CSSProperties = {
    position: `absolute`,
    top: `0`,
    width: `1`,
    height: `1`,
    padding: `0`,
    overflow: `hidden`,
    clip: `rect(0, 0, 0, 0)`,
    whiteSpace: `nowrap`,
    border: `0`,
  }

  return (
    <div
      {...props}
      data-redwood-route-announcement
      style={visuallyHidden ? hiddenStyle : {}}
    >
      {children}
    </div>
  )
}

export interface RouteAnnouncementProps {
  children: React.ReactNode
  visuallyHidden?: boolean
}

export default RouteAnnouncement
