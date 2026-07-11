import type { A } from 'ts-toolbelt'

import { setContext, context as globalContext } from '@redwoodjs/context'
import type {
  DirectiveParams,
  ValidatorDirective,
  TransformerDirective,
} from '@redwoodjs/graphql-server'
import { DirectiveType } from '@redwoodjs/graphql-server'

export { getDirectiveName } from '@redwoodjs/graphql-server'

// @NOTE: overloaded interface
interface DirectiveMocker {
  (
    directive: ValidatorDirective,
    executionMock: A.Compute<Omit<Partial<DirectiveParams>, 'resolvedValue'>>,
  ): any
}

type TransformerMock = A.Compute<
  Omit<Partial<DirectiveParams>, 'resolvedValue'>
> & {
  mockedResolvedValue: any
}

// Overload this definition for transformers
interface DirectiveMocker {
  (directive: TransformerDirective, executionMock: TransformerMock): any
}

/**
 * @description
 *
 * Used for writing both synchronous and asynchronous directive tests e.g.
 *
 * - Transformer directives can be passed mockedResolvedValue
 * - Validator directives should check for errors thrown in certain situations
 * - Can provide args, directiveArgs and context to mock directive execution
 *
 * @example
 *
 * Synchronous transformer directive:
 *
 * ```ts
 * const mockExecution = mockRedwoodDirective(myTransformer, {
 *   context: currentUser,
 *   mockedResolvedValue: 'Original Value',
 * })
 *
 * expect(mockExecution).not.toThrow()
 * expect(mockExecution()).toEqual('Transformed Value')
 * ```ts
 *
 * @example
 *
 * Asynchronous transformer directive:
 *
 * ```ts
 * const mockExecution = mockRedwoodDirective(myTransformer, {
 *   context: currentUser,
 *   mockedResolvedValue: 'Original Value',
 * })
 *
 * await expect(mockExecution).resolves.not.toThrow()
 * await expect(mockExecution()).resolves.toEqual('Transformed Value')
 * ```
 */
export const mockRedwoodDirective: DirectiveMocker = (
  directive,
  executionMock,
) => {
  const { directiveArgs, context, ...others } = executionMock

  if (directive.onResolvedValue.constructor.name === 'AsyncFunction') {
    return async () => {
      if (context !== undefined) {
        setContext(context)
      }

      if (directive.type === DirectiveType.TRANSFORMER) {
        const { mockedResolvedValue } = others as TransformerMock
        return directive.onResolvedValue({
          resolvedValue: mockedResolvedValue,
          directiveArgs: directiveArgs ?? {},
          context: globalContext,
          ...others,
        } as DirectiveParams)
      } else {
        await directive.onResolvedValue({
          directiveArgs: directiveArgs ?? {},
          context: globalContext,
          ...others,
        } as DirectiveParams)
      }
    }
  }

  return () => {
    if (context !== undefined) {
      setContext(context)
    }

    if (directive.type === DirectiveType.TRANSFORMER) {
      const { mockedResolvedValue } = others as TransformerMock
      return directive.onResolvedValue({
        resolvedValue: mockedResolvedValue,
        directiveArgs: directiveArgs ?? {},
        context: globalContext,
        ...others,
      } as DirectiveParams)
    } else {
      directive.onResolvedValue({
        directiveArgs: directiveArgs ?? {},
        context: globalContext,
        ...others,
      } as DirectiveParams)
    }
  }
}
