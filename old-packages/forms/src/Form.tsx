import React, { forwardRef } from 'react'
import type { ForwardedRef } from 'react'

import { useForm, FormProvider } from 'react-hook-form'
import type { FieldValues, UseFormReturn, UseFormProps } from 'react-hook-form'

import { ServerErrorsContext } from './ServerErrorsContext'

export interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.ComponentPropsWithRef<'form'>, 'onSubmit'> {
  error?: any
  /**
   * The methods returned by `useForm`.
   * This prop is only necessary if you've called `useForm` yourself to get
   * access to one of its functions, like `reset`.
   *
   * @example
   *
   * ```typescript
   * const formMethods = useForm<FormData>()
   *
   * const onSubmit = (data: FormData) => {
   *  sendDataToServer(data)
   *  formMethods.reset()
   * }
   *
   * return (
   *   <Form formMethods={formMethods} onSubmit={onSubmit}>
   * )
   * ```
   */
  formMethods?: UseFormReturn<TFieldValues>
  /**
   * Configures how React Hook Form performs validation, among other things.
   *
   * @example
   *
   * ```jsx
   * <Form config={{ mode: 'onBlur' }}>
   * ```
   *
   * @see {@link https://react-hook-form.com/api/useform}
   */
  config?: UseFormProps<TFieldValues>
  onSubmit?: (value: TFieldValues, event?: React.BaseSyntheticEvent) => void
}

/**
 * Renders a `<form>` with the required context.
 */
function FormInner<TFieldValues extends FieldValues>(
  {
    config,
    error: errorProps,
    formMethods: propFormMethods,
    onSubmit,
    children,
    ...rest
  }: FormProps<TFieldValues>,
  ref: ForwardedRef<HTMLFormElement>,
) {
  const hookFormMethods = useForm<TFieldValues>(config)
  const formMethods = propFormMethods || hookFormMethods

  return (
    <form
      ref={ref}
      {...rest}
      onSubmit={formMethods.handleSubmit((data, event) =>
        onSubmit?.(data, event),
      )}
    >
      <ServerErrorsContext.Provider
        value={
          errorProps?.graphQLErrors?.[0]?.extensions?.properties?.messages || {}
        }
      >
        <FormProvider {...formMethods}>{children}</FormProvider>
      </ServerErrorsContext.Provider>
    </form>
  )
}

// Sorry about the `as` type assertion (type cast) here. Normally I'd redeclare
// forwardRef to only return a plain function, allowing us to use TypeScript's
// Higher-order Function Type Inference. But that gives us problems with the
// ForwardRefExoticComponent type we use for our InputComponents. So instead
// of changing that type (because it's correct) I use a type assertion here.
// forwardRef is notoriously difficult to use with UI component libs.
// Chakra-UI also says:
// > To be honest, the forwardRef type is quite complex [...] I'd recommend
// > that you cast the type
// https://github.com/chakra-ui/chakra-ui/issues/4528#issuecomment-902566185
export const Form = forwardRef(FormInner) as <TFieldValues extends FieldValues>(
  props: FormProps<TFieldValues> & React.RefAttributes<HTMLFormElement>,
) => React.ReactElement | null
