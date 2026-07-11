import type { EmptyAsValue, RedwoodRegisterOptions } from './coercion'

/**
 * The main interface, just to have some sort of source of truth.
 *
 * @typeParam E - The type of element; we're only ever working with a few HTMLElements.
 *
 * `extends` constrains the generic while `=` provides a default.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints}
 *
 * @internal
 */
export interface FieldProps<
  Element extends
    | HTMLTextAreaElement
    | HTMLSelectElement
    | HTMLInputElement = HTMLInputElement,
> {
  name: string
  id?: string
  emptyAs?: EmptyAsValue
  errorClassName?: string
  errorStyle?: React.CSSProperties
  className?: string
  style?: React.CSSProperties
  validation?: RedwoodRegisterOptions
  type?: string
  onBlur?: React.FocusEventHandler<Element>
  onChange?: React.ChangeEventHandler<Element>
}
