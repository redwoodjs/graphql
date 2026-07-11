import type { ForwardedRef } from 'react'
import React, { forwardRef } from 'react'

import type { FieldProps } from './FieldProps'
import { useErrorStyles } from './useErrorStyles'
import { useRegister } from './useRegister'

export interface SelectFieldProps
  extends Omit<FieldProps<HTMLSelectElement>, 'type'>,
    Omit<React.ComponentPropsWithRef<'select'>, 'name'> {}

/** Renders a `<select>` field */
export const SelectField = forwardRef(
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
    }: SelectFieldProps,
    ref: ForwardedRef<HTMLSelectElement>,
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
      <select id={id || name} {...rest} {...styles} {...useRegisterReturn} />
    )
  },
)
