import React from 'react'

import type { FieldProps } from './FieldProps'
import { useErrorStyles } from './useErrorStyles'

export interface LabelProps
  extends Pick<FieldProps, 'errorClassName' | 'errorStyle'>,
    React.ComponentPropsWithoutRef<'label'> {
  name: string
}

/**
 * Renders a `<label>` that can be styled differently if errors are present on the related fields.
 */
export const Label = ({
  name,
  children,
  // for useErrorStyles
  errorClassName,
  errorStyle,
  className,
  style,
  ...rest
}: LabelProps) => {
  const styles = useErrorStyles({
    name,
    errorClassName,
    errorStyle,
    className,
    style,
  })

  return (
    <label htmlFor={name} {...rest} {...styles}>
      {children || name}
    </label>
  )
}
