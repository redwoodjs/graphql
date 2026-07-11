import React, { useContext } from 'react'

import { get, useFormContext } from 'react-hook-form'

import type { FieldProps } from './FieldProps'
import { ServerErrorsContext } from './ServerErrorsContext'

export type UseErrorStylesProps = Pick<
  FieldProps,
  'name' | 'errorClassName' | 'errorStyle' | 'className' | 'style'
>

/**
 * Adds styling to a field when an error is present.
 *
 * @remarks
 *
 * Mostly just a `useEffect` hook.
 *
 * `className` and `style` get swapped with `errorClassName` and `errorStyle` respectively
 * when an error's present (on the server or otherwise).
 */
export const useErrorStyles = ({
  name,
  errorClassName,
  errorStyle,
  className,
  style,
}: UseErrorStylesProps) => {
  const {
    formState: { errors },
    setError,
  } = useFormContext()

  const serverError = useContext(ServerErrorsContext)[name]

  React.useEffect(() => {
    if (serverError) {
      setError(name, { type: 'server', message: serverError })
    }
  }, [serverError, name, setError])

  const validationError = name ? get(errors, name) : undefined

  if (validationError) {
    if (errorClassName) {
      className = errorClassName
    }

    if (errorStyle) {
      style = errorStyle
    }
  }

  return { className, style }
}
