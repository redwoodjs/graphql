/**
 * @module @redwoodjs/forms
 *
 * Redwood's form library.
 * Mostly simple wrappers around `react-hook-form` that make it even easier to use.
 *
 * @remarks
 *
 * @redwoodjs/forms slightly extends `react-hook-form`'s `valueAs` props because it's important for us to coerce values
 * to the correct type for GraphQL.
 * The properties that are exclusive to Redwood are:
 * - `valueAsBoolean`
 * - `valueAsJSON`
 * - `emptyAs`
 *
 * @see {@link https://react-hook-form.com/}
 *
 * @remarks
 *
 * We make all of `react-hook-form`'s exports available as well.
 *
 * @privateRemarks
 *
 * The two main hooks in this library are:
 * - `useErrorStyles`
 * - `useRegister`
 *
 * `useErrorStyles` implements the error-specific styling via `useEffect`.
 *
 * `useRegister` hooks fields up to `react-hook-form` while providing some sensible defaults
 * based on the field's type.

 * @privateRemarks
 *
 * We use `React.ComponentPropsWithRef` and `React.ComponentPropsWithoutRef` instead of `React.FC`
 * because the community seems to be shifting away from `React.FC`.
 *
 * @see {@link https://fettblog.eu/typescript-react-why-i-dont-use-react-fc/}
 * @see {@link https://github.com/facebook/create-react-app/pull/8177}
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/}
 *
 * @privateRemarks
 *
 * As for interfaces vs types, we're going with TypesScript's recommendation to use interfaces until types are needed.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces}
 */

export * from 'react-hook-form'

export { CheckboxField } from './CheckboxField'
export type { EmptyAsValue, RedwoodRegisterOptions } from './coercion'
export { FieldError } from './FieldError'
export { Form, FormProps } from './Form'
export { default as FormError } from './FormError'
export type { ServerError, RWGqlError, ServerParseError } from './FormError'
export {
  InputField,
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
} from './InputComponents'
export type { InputFieldProps } from './InputComponents'
export { Label } from './Label'
export { SelectField } from './SelectField'
export { ServerErrorsContext } from './ServerErrorsContext'
export { Submit } from './Submit'
export { TextAreaField } from './TextAreaField'
export { useErrorStyles } from './useErrorStyles'
export { useRegister } from './useRegister'
