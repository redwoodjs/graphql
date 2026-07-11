import React from 'react'

import { get, useFormContext } from 'react-hook-form'

export interface FieldErrorProps
  extends React.ComponentPropsWithoutRef<'span'> {
  /**
   * The name of the field the `<FieldError>`'s associated with.
   */
  name: string
}

const DEFAULT_MESSAGES = {
  required: 'is required',
  pattern: 'is not formatted correctly',
  minLength: 'is too short',
  maxLength: 'is too long',
  min: 'is too low',
  max: 'is too high',
  validate: 'is not valid',
}

/**
 * Renders a `<span>` with an error message if there's a validation error on the corresponding field.
 * If no error message is provided, a default one is used based on the type of validation that caused the error.
 *
 * @example Displaying a validation error message with `<FieldError>`
 *
 * `<FieldError>` doesn't render (i.e. returns `null`) when there's no error on `<TextField>`.
 *
 * ```jsx
 * <Label name="name" errorClassName="error">
 *   Name
 * </Label>
 * <TextField
 *   name="name"
 *   validation={{ required: true }}
 *   errorClassName="error"
 * />
 * <FieldError name="name" className="error" />
 * ```
 *
 * @see {@link https://redwoodjs.com/docs/tutorial/chapter3/forms#fielderror}
 *
 * @privateRemarks
 *
 * This is basically a helper for a common pattern you see in `react-hook-form`:
 *
 * ```jsx
 * <form onSubmit={handleSubmit(onSubmit)}>
 *   <input {...register("firstName", { required: true })} />
 *   {errors.firstName?.type === 'required' && "First name is required"}
 * ```
 *
 * @see {@link https://react-hook-form.com/get-started#Handleerrors}
 */
export const FieldError = ({ name, ...rest }: FieldErrorProps) => {
  const {
    formState: { errors },
  } = useFormContext()

  const validationError = get(errors, name)

  const errorMessage =
    validationError &&
    (validationError.message ||
      `${name} ${
        DEFAULT_MESSAGES[validationError.type as keyof typeof DEFAULT_MESSAGES]
      }`)

  return validationError ? <span {...rest}>{errorMessage}</span> : null
}
