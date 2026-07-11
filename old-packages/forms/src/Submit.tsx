import React, { forwardRef } from 'react'

/**
 * Renders a `<button type="submit">` field.
 *
 * @example
 * ```jsx{3}
 * <Form onSubmit={onSubmit}>
 *   // ...
 *   <Submit>Save</Submit>
 * </Form>
 * ```
 */
export const Submit = forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentPropsWithRef<'button'>, 'type'>
>((props, ref) => <button ref={ref} type="submit" {...props} />)
