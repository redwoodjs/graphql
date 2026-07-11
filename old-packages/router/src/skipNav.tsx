// Original Code Source https://github.com/reach/reach-ui
// Moving here to resolve unmet peer dependency issues related to React 18
// If resolved, should consider reverting to @reach/skip-nav
// See: https://github.com/reach/reach-ui/issues/916

import * as React from 'react'

////////////////////////////////////////////////////////////////////////////////

// Original Code Source @reach/polymorphic
// https://github.com/reach/reach-ui/blob/dev/packages/polymorphic/src/reach-polymorphic.ts
// We updated three instances of type "{}" to "object" to avoid linting errors

type Merge<P1 = object, P2 = object> = Omit<P1, keyof P2> & P2

type ForwardRefExoticComponent<E, OwnProps> = React.ForwardRefExoticComponent<
  Merge<
    E extends React.ElementType ? React.ComponentPropsWithRef<E> : never,
    OwnProps & { as?: E }
  >
>

interface ForwardRefComponent<
  IntrinsicElementString,
  OwnProps = object,
  /*
   * Extends original type to ensure built in React types play nice with
   * polymorphic components still e.g. `React.ElementRef` etc.
   */
> extends ForwardRefExoticComponent<IntrinsicElementString, OwnProps> {
  /*
   * When `as` prop is passed, use this overload. Merges original own props
   * (without DOM props) and the inferred props from `as` element with the own
   * props taking precendence.
   *
   * We explicitly avoid `React.ElementType` and manually narrow the prop types
   * so that events are typed when using JSX.IntrinsicElements.
   */
  <As = IntrinsicElementString>(
    props: As extends ''
      ? { as: keyof JSX.IntrinsicElements }
      : As extends React.ComponentType<infer P>
        ? Merge<P, OwnProps & { as: As }>
        : As extends keyof JSX.IntrinsicElements
          ? Merge<JSX.IntrinsicElements[As], OwnProps & { as: As }>
          : never,
  ): React.ReactElement | null
}

////////////////////////////////////////////////////////////////////////////////

// Original Code Source @reach/skip-nav
// https://github.com/reach/reach-ui/blob/dev/packages/skip-nav/src/reach-skip-nav.tsx

// The user may want to provide their own ID (maybe there are multiple nav
// menus on a page a use might want to skip at various points in tabbing?).
const defaultId = 'reach-skip-nav'

/**
 * SkipNavLink
 *
 * Renders a link that remains hidden until focused to skip to the main content.
 *
 * @see Docs https://reach.tech/skip-nav#skipnavlink
 */
const SkipNavLink = React.forwardRef(function SkipNavLink(
  { as: Comp = 'a', children = 'Skip to content', contentId, ...props },
  forwardedRef,
) {
  const id = contentId || defaultId
  return (
    <Comp
      {...props}
      ref={forwardedRef}
      href={`#${id}`}
      // TODO: Remove in 1.0 (kept for back compat)
      data-reach-skip-link=""
      data-reach-skip-nav-link=""
    >
      {children}
    </Comp>
  )
}) as ForwardRefComponent<'a', SkipNavLinkProps>

/**
 * @see Docs https://reach.tech/skip-nav#skipnavlink-props
 */
interface SkipNavLinkProps {
  /**
   * Allows you to change the text for your preferred phrase or localization.
   *
   * @see Docs https://reach.tech/skip-nav#skipnavlink-children
   */
  children?: React.ReactNode
  /**
   * An alternative ID for `SkipNavContent`. If used, the same value must be
   * provided to the `id` prop in `SkipNavContent`.
   *
   * @see Docs https://reach.tech/skip-nav#skipnavlink-contentid
   */
  contentId?: string
}

SkipNavLink.displayName = 'SkipNavLink'

////////////////////////////////////////////////////////////////////////////////

/**
 * SkipNavContent
 *
 * Renders a div as the target for the link.
 *
 * @see Docs https://reach.tech/skip-nav#skipnavcontent
 */
const SkipNavContent = React.forwardRef(function SkipNavContent(
  { as: Comp = 'div', id: idProp, ...props },
  forwardedRef,
) {
  const id = idProp || defaultId
  return (
    <Comp
      {...props}
      ref={forwardedRef}
      id={id}
      data-reach-skip-nav-content=""
    />
  )
}) as ForwardRefComponent<'div', SkipNavContentProps>

/**
 * @see Docs https://reach.tech/skip-nav#skipnavcontent-props
 */
interface SkipNavContentProps {
  /**
   * You can place the `SkipNavContent` element as a sibling to your main
   * content or as a wrapper.
   *
   * Keep in mind it renders a `div`, so it may mess with your CSS depending on
   * where it’s placed.
   *
   * @example
   *   <SkipNavContent />
   *   <YourMainContent />
   *   // vs.
   *   <SkipNavContent>
   *     <YourMainContent/>
   *   </SkipNavContent>
   *
   * @see Docs https://reach.tech/skip-nav#skipnavcontent-children
   */
  children?: React.ReactNode
  /**
   * An alternative ID. If used, the same value must be provided to the
   * `contentId` prop in `SkipNavLink`.
   *
   * @see Docs https://reach.tech/skip-nav#skipnavcontent-id
   */
  id?: string
}

SkipNavContent.displayName = 'SkipNavContent'

////////////////////////////////////////////////////////////////////////////////
// Exports

export type { SkipNavContentProps, SkipNavLinkProps }
export { SkipNavLink, SkipNavContent }
