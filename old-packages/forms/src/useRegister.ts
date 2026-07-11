import type React from 'react'

import { useFormContext } from 'react-hook-form'

import type { EmptyAsValue } from './coercion'
import { setCoercion } from './coercion'
import type { FieldProps } from './FieldProps'

export type UseRegisterProps<
  Element extends
    | HTMLTextAreaElement
    | HTMLSelectElement
    | HTMLInputElement = HTMLInputElement,
> = Pick<
  FieldProps<Element>,
  'name' | 'validation' | 'type' | 'onBlur' | 'onChange'
>

/**
 * useRegister
 *
 * Register the field into `react-hook-form` with defaults.
 *
 * @remarks
 *
 * A field's `validation` prop is `react-hook-form`'s `RegisterOptions`
 * (with Redwood's extended `valueAs` props).
 *
 * @see {@link https://react-hook-form.com/api/useform/register}
 */
export const useRegister = <
  T,
  Element extends
    | HTMLTextAreaElement
    | HTMLSelectElement
    | HTMLInputElement = HTMLInputElement,
>(
  props: UseRegisterProps<Element> & { element?: string },
  ref?: React.ForwardedRef<T>,
  emptyAs?: EmptyAsValue,
) => {
  const { register } = useFormContext()
  const { name } = props
  if (!name) {
    throw Error('`name` prop must be provided')
  }

  const validation = props.validation || { required: false }

  setCoercion(validation, {
    type: props.type,
    name,
    emptyAs,
  })

  const {
    ref: _ref,
    onBlur: handleBlur,
    onChange: handleChange,
    ...rest
  } = register(name, validation)

  const onBlur: React.FocusEventHandler<Element> = (event) => {
    handleBlur(event)
    props.onBlur?.(event)
  }

  const onChange: React.ChangeEventHandler<Element> = (event) => {
    handleChange(event)
    props.onChange?.(event)
  }

  return {
    ...rest,
    ref: (element: T) => {
      _ref(element)

      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    },
    onBlur,
    onChange,
  }
}
