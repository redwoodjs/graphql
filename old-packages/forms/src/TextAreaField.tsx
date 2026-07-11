import type { ForwardedRef } from 'react'
import React, { forwardRef } from 'react'

import type { FieldProps } from './FieldProps'
import { useErrorStyles } from './useErrorStyles'
import { useRegister } from './useRegister'

export interface TextAreaFieldProps
  extends Omit<FieldProps<HTMLTextAreaElement>, 'type'>,
    Omit<React.ComponentPropsWithRef<'textarea'>, 'name'> {}

/**
 * Renders a `<textarea>` field.
 */
export const TextAreaField = forwardRef(
  (
    {
      name,
      id,
      emptyAs,

      // for useErrorStyles
      errorClassName,
      errorStyle,
      className,
      style,
      // for useRegister
      validation,
      onBlur,
      onChange,

      ...rest
    }: TextAreaFieldProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ) => {
    const styles = useErrorStyles({
      name,
      errorClassName,
      errorStyle,
      className,
      style,
    })

    const useRegisterReturn = useRegister(
      {
        name,
        validation,
        onBlur,
        onChange,
      },
      ref,
      emptyAs,
    )

    return (
      <textarea id={id || name} {...rest} {...styles} {...useRegisterReturn} />
    )
  },
)
