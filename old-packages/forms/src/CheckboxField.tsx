import type { ForwardedRef } from 'react'
import React, { forwardRef } from 'react'

import type { FieldProps } from './FieldProps'
import { useErrorStyles } from './useErrorStyles'
import { useRegister } from './useRegister'

export interface CheckboxFieldProps
  extends Omit<FieldProps<HTMLInputElement>, 'type' | 'emptyAs'>,
    Omit<React.ComponentPropsWithRef<'input'>, 'name' | 'type'> {}

/** Renders an `<input type="checkbox">` field */
export const CheckboxField = forwardRef(
  (
    {
      name,
      id,
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
    }: CheckboxFieldProps,
    ref: ForwardedRef<HTMLInputElement>,
  ) => {
    const styles = useErrorStyles({
      name,
      errorClassName,
      errorStyle,
      className,
      style,
    })

    const type = 'checkbox'

    const useRegisterReturn = useRegister(
      {
        name,
        validation,
        onBlur,
        onChange,
        type,
      },
      ref,
    )

    return (
      <input
        id={id || name}
        {...rest}
        /** This order ensures type="checkbox" */
        type={type}
        {...styles}
        {...useRegisterReturn}
      />
    )
  },
)
