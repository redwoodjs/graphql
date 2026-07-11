import type { RegisterOptions } from 'react-hook-form'

/**
 * We slightly extend `react-hook-form`'s `RegisterOptions` to make working with GraphQL easier.
 * `react-hook-form` provides the prop `setValueAs` for all-purpose coercion
 * (i.e. anything that isn't `valueAsDate` or `valueAsNumber`, which are standard HTML).
 *
 * @see {@link https://react-hook-form.com/api/useform/register}
 */
export type RedwoodRegisterOptions = RegisterOptions & {
  valueAsBoolean?: boolean
  valueAsJSON?: boolean
}

// Used to determine if a value is empty.
const isValueEmpty = (val: string): boolean => val === ''

/**
 * EmptyAsValue defines the values that can be used for the field emptyAs prop
 * It sets the value to be returned from the field if the field is empty.
 * If the valueOf prop is truly undefined (not 'undefined'), it will return
 * a default value corresponding to the type of field. (See
 * the comments above the setCoercion function for more details)
 */

export type EmptyAsValue = null | 'undefined' | 0 | ''

type ValueAsType =
  | 'valueAsDate'
  | 'valueAsJSON'
  | 'valueAsNumber'
  | 'valueAsString'

type SetValueAsFn = (val: string) => any
/*
 * One of the functions in the SET_VALUE_AS_FUNCTIONS object is
 * passed to the react-hook-forms setValueAs prop by the getSetValueAsFn
 * function which is used by the setCoercion function
 * There may be an alternate solution using closures that is less explicit, but
 * would likely be more troublesome to debug.
 */
const SET_VALUE_AS_FUNCTIONS: Record<
  ValueAsType,
  Record<string, SetValueAsFn>
> = {
  // valueAsBoolean is commented out as r-h-f does not currently support
  // setValueAs functionality for checkboxes.  May investigate future
  // integration
  /*  valueAsBoolean: {
    // r-h-f returns a boolean if a checkBox type, but also handle string case in case valueAsBoolean is used
    base: (val: boolean | string): boolean => !!val,
    emptyAsNull: (val: boolean | string): boolean | null => (val ? true : null),
    emptyAsUndefined: (val: boolean | string): boolean | undefined =>
      val ? true : undefined,
  },*/
  valueAsDate: {
    emptyAsNull: (val: string): Date | null =>
      isValueEmpty(val) ? null : new Date(val),
    emptyAsUndefined: (val: string): Date | undefined =>
      isValueEmpty(val) ? undefined : new Date(val),
    emptyAsString: (val: string): Date | '' =>
      isValueEmpty(val) ? '' : new Date(val),
    emptyAsZero: (val: string): Date | 0 =>
      isValueEmpty(val) ? 0 : new Date(val),
  },
  valueAsJSON: {
    emptyAsNull: (val: string) => {
      if (isValueEmpty(val)) {
        return null
      }
      try {
        return JSON.parse(val)
      } catch {
        return NaN // represents invalid JSON parse to JSONValidation function
      }
    },
    emptyAsString: (val: string) => {
      if (isValueEmpty(val)) {
        return ''
      }
      try {
        return JSON.parse(val)
      } catch {
        return NaN // represents invalid JSON parse to JSONValidation function
      }
    },
    emptyAsUndefined: (val: string) => {
      if (isValueEmpty(val)) {
        return undefined
      }
      try {
        return JSON.parse(val)
      } catch {
        return NaN // represents invalid JSON parse to JSONValidation function
      }
    },
    emptyAsZero: (val: string) => {
      if (isValueEmpty(val)) {
        return 0
      }
      try {
        return JSON.parse(val)
      } catch {
        return NaN // represents invalid JSON parse to JSONValidation function
      }
    },
  },
  valueAsNumber: {
    emptyAsNull: (val: string): number | null =>
      isValueEmpty(val) ? null : +val,
    emptyAsUndefined: (val: string): number | undefined =>
      isValueEmpty(val) ? undefined : +val,
    emptyAsNaN: (val: string): number => (isValueEmpty(val) ? NaN : +val),
    emptyAsString: (val: string): number | '' =>
      isValueEmpty(val) ? '' : +val,
    emptyAsZero: (val: string): number => (isValueEmpty(val) ? 0 : +val),
  },
  valueAsString: {
    emptyAsNull: (val: string) => (isValueEmpty(val) ? null : val),
    emptyAsUndefined: (val: string) => (isValueEmpty(val) ? undefined : val),
    emptyAsString: (val: string): string => (isValueEmpty(val) ? '' : val),
    emptyAsZero: (val: string): string | number =>
      isValueEmpty(val) ? 0 : val,
  },
}

// Note that the emptyAs parameter takes precedence over the type, required,
// and isId parameters
const getSetValueAsFn = (
  type: ValueAsType,
  emptyAs: EmptyAsValue | undefined,
  required: boolean,
  isId: boolean,
) => {
  const typeObj = SET_VALUE_AS_FUNCTIONS[type]
  if (typeObj === undefined) {
    throw Error(`Type ${type} is unsupported.`)
  }
  let fn
  switch (emptyAs) {
    case null:
      fn = typeObj['emptyAsNull']
      break
    case 'undefined':
      fn = typeObj['emptyAsUndefined']
      break
    case 0:
      fn = typeObj['emptyAsZero']
      break
    case '':
      fn = typeObj['emptyAsString']
      break
    case undefined:
    default:
      if (required || isId) {
        fn = typeObj.emptyAsNull
      } else {
        // set the default SetValueAsFn
        switch (type) {
          case 'valueAsNumber':
            fn = typeObj.emptyAsNaN
            break
          case 'valueAsDate':
          case 'valueAsJSON':
            fn = typeObj.emptyAsNull
            break
          case 'valueAsString':
            fn = typeObj.emptyAsString
            break
        }
      }
      break
  }
  if (fn === undefined) {
    console.error(`emptyAs prop of ${emptyAs} is unsupported for this type.`)
  }
  return fn
}

// This function is passed into r-h-f's validate function if valueAsJSON is set
const JSONValidation = (val: Record<string, unknown> | null | number) =>
  typeof val === 'number' ? !isNaN(val) : true

/**
 * ** setCoercion **
 * Handles the flow of coercion, providing a default if none is specified.
 * Also implements Redwood's extensions to `react-hook-form`'s `valueAs` props.
 *
 * To provide Redwood specific functionality, we need to override part of
 * react-hook-form`'s functionality in some cases. This is accomplished
 * through the use of the setValueAs function supported by r-h-f.
 * If a setValueAs function is provided by the user, it takes precedence over
 * the emptyAs prop.
 *
 * Redwood provides specific logic to address field empty scenarios through
 * the use of the emptyAs prop. The decision chain for behavior on field empty
 * scenarios is as follows:
 *   1. if setValueAs is specified by the user, that will determine the behavior
 *   2  if emptyAs is specified, then the emptyAs prop will determine the
 *      field value on an empty condition.
 *   3. if { validation.required } is set, an empty field will return null; however,
 *      r-h-f's validation should engage and prevent submission of the form.
 *   4. if the field is an Id field, that is its name ends in "Id", then an empty
 *      field will return null.
 *   5. In the event of none of the above cases, the field value will be set as
 *      follows for empty field scenarios:
 *       DateFields => null
 *       NumberFields => NaN
 *       TextFields with valueAsNumber set => NaN
 *       SelectFields with valueAsNumber set => NaN
 *       SelectFields without valueAsNumber set => '' (empty string)
 *       TextFields with valueAsJSON set => null
 *       TextFields and comparable => '' (empty string)
 */

interface SetCoercionProps {
  type?: string
  name: string
  emptyAs?: EmptyAsValue
}

export const setCoercion = (
  validation: RedwoodRegisterOptions,
  { type, name, emptyAs }: SetCoercionProps,
) => {
  if (validation.setValueAs) {
    // Note, this case could override other props
    return
  }
  let valueAs: ValueAsType

  if (validation.valueAsBoolean || type === 'checkbox') {
    // Note the react-hook-forms setValueAs prop does not work in react-hook-forms
    // for checkboxes and thus Redwood does not provide emptyAs functionality
    // for checkboxes for now.
    return
  } else if (validation.valueAsJSON) {
    validation.validate = JSONValidation
    delete validation.valueAsJSON
    valueAs = 'valueAsJSON'
  } else if (
    type === 'date' ||
    type === 'datetime-local' ||
    validation.valueAsDate
  ) {
    valueAs = 'valueAsDate'
  } else if (type === 'number' || validation.valueAsNumber) {
    valueAs = 'valueAsNumber'
    // If we are using the emptyAs feature, it does not work well
    // with react-hook-form valueAsNumber, and thus we will rely
    // on the setValueAs function below, which will do the same thing
    if (validation.valueAsNumber && emptyAs !== undefined) {
      delete validation.valueAsNumber
    }
  } else {
    valueAs = 'valueAsString'
  }

  validation.setValueAs = getSetValueAsFn(
    valueAs, // type
    emptyAs, // emptyAs
    validation.required !== undefined && validation.required !== false, // required
    (name || '').endsWith('Id'), // isId
  )
}
