import type { ForwardedRef } from 'react'
import React, { forwardRef } from 'react'

import pascalcase from 'pascalcase'

import type { FieldProps } from './FieldProps'
import { useErrorStyles } from './useErrorStyles'
import { useRegister } from './useRegister'

/**
 * All the types we'll be generating named `<InputFields>` for (which is basically all of them).
 * Note that `'checkbox'` isn't here because we handle it separately above.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types}
 */
const INPUT_TYPES = [
  'button',
  'color',
  'date',
  'datetime-local',
  'email',
  'file',
  'hidden',
  'image',
  'month',
  'number',
  'password',
  'radio',
  'range',
  'reset',
  'search',
  'submit',
  'tel',
  'text',
  'time',
  'url',
  'week',
] as const

type InputType = (typeof INPUT_TYPES)[number]

export interface InputFieldProps
  extends Omit<FieldProps<HTMLInputElement>, 'type'>,
    Omit<React.ComponentPropsWithRef<'input'>, 'name' | 'type'> {
  /**
   * @privateRemarks
   *
   * With this typing, passing `'checkbox'` to `<InputField>`'s type is an error, which,
   * at face value, feels like it shouldn't be.
   *
   * Even though we provide a separate `<CheckboxField>`, maybe we should reconsider the typing here?
   */
  type?: InputType
}

/**
 * Renders an `<input>` field.
 *
 * @see {@link https://redwoodjs.com/docs/forms#input-fields}
 */
export const InputField = forwardRef(
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
      type,
      ...rest
    }: InputFieldProps,
    ref: ForwardedRef<HTMLInputElement>,
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
        type,
      },
      ref,
      emptyAs,
    )

    return (
      <input
        id={id || name}
        {...rest}
        type={type}
        {...styles}
        {...useRegisterReturn}
      />
    )
  },
)

/**
 * `React.ForwardRefExoticComponent` is `forwardRef`'s return type.
 * You can hover over `<InputField>` above to see the type inference at work.
 */
const InputComponents: Record<
  string,
  React.ForwardRefExoticComponent<Omit<InputFieldProps, 'type'>>
> = {}

/**
 * Create a component for each type in `INPUT_TYPES`.
 *
 * Rather than writing out each and every component definition,
 * we use a bit of JS metaprogramming to create them all with the appropriate name.
 *
 * We end up with `InputComponents.TextField`, `InputComponents.TimeField`, etc.
 * Export those and we're good to go!
 */
INPUT_TYPES.forEach((type) => {
  InputComponents[`${pascalcase(type)}Field`] = forwardRef<
    HTMLInputElement,
    Omit<InputFieldProps, 'type'>
  >((props, ref) => <InputField ref={ref} type={type} {...props} />)
})

export const {
  ButtonField,
  ColorField,
  DateField,
  DatetimeLocalField,
  EmailField,
  FileField,
  HiddenField,
  ImageField,
  MonthField,
  NumberField,
  PasswordField,
  RadioField,
  RangeField,
  ResetField,
  SearchField,
  SubmitField,
  TelField,
  TextField,
  TimeField,
  UrlField,
  WeekField,
} = InputComponents
