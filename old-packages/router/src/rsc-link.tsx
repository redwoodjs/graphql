import React, { forwardRef } from 'react'

export interface LinkProps {
  to: string
}

// TODO(RSC): RW could have a client-side script that finds all rsc links and
// hydrates them with the same onClick behavior as the Link component
// Maybe somewhere we have a generic onClick event interceptor that catches
// bubbling clicks. We could generate unique ids to know exactly what element
// was clicked if needed.
// Going further we could even let the user pass their own onClicks, split them
// off at compilation time, and store a reference to them. Then we can send
// them to the client separately and have our own onClick interceptor find
// those scripts and execute them on the client
//
// TODO(RSC): <Link /> is used together with `routes`, like
// ```
// <Link to={routes.about()}>About</Link>
// ```
// This currently doesn't work because `routes` isn't available on the server
// We need to fix that

export const Link = forwardRef<
  HTMLAnchorElement,
  LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ to, ...rest }, ref) => {
  return <a href={to} ref={ref} {...rest} />
})
