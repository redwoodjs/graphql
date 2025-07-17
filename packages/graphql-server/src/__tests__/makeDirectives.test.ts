import gql from 'graphql-tag'
import { describe, expect, it } from 'vitest'

import type { DirectiveParams } from '..'
import {
  makeDirectivesForPlugin,
  createTransformerDirective,
  createValidatorDirective,
} from '../directives/makeDirectives'

const fooSchema = gql`
  directive @foo on FIELD_DEFINITION
`

const bazingaSchema = gql`
  directive @bazinga on FIELD_DEFINITION
`

const barSchema = gql`
  directive @bar on FIELD_DEFINITION
`

it('Should map directives globs to defined structure correctly', async () => {
  // Mocking what our import-dir plugin would do
  const directiveFiles = {
    foo_directive: {
      schema: fooSchema,
      foo: createTransformerDirective(fooSchema, () => 'I am foo'),
    },
    nested_bazinga_directive: {
      bazinga: createValidatorDirective(bazingaSchema, async () => {
        throw new Error('Only soft kittens allowed')
      }),
      schema: bazingaSchema,
    },
    heavily_nested_bar_directive: {
      bar: createTransformerDirective(barSchema, () => 'I am bar'),
      schema: barSchema,
    },
  }

  const [fooDirective, bazingaDirective, barDirective] =
    makeDirectivesForPlugin(directiveFiles)

  expect(fooDirective.name).toBe('foo')
  expect(fooDirective.onResolvedValue({} as DirectiveParams)).toBe('I am foo')
  expect(fooDirective.schema.kind).toBe('Document')

  expect(bazingaDirective.name).toBe('bazinga')
  expect(bazingaDirective.onResolvedValue).rejects.toThrowError(
    'Only soft kittens allowed',
  )
  expect(bazingaDirective.schema.kind).toBe('Document')

  expect(barDirective.name).toBe('bar')
  expect(await barDirective.onResolvedValue({} as DirectiveParams)).toBe(
    'I am bar',
  )
  expect(barDirective.schema.kind).toBe('Document')
})

describe('Errors out with a helpful message, if the directive is not constructed correctly', () => {
  it('Tells you if you forgot to wrap the implementation function', () => {
    const incorrectDirectiveFiles = {
      foo_directive: {
        schema: fooSchema,
        foo: () => 'Oopy I forgot to wrap',
      },
    }

    expect(() => makeDirectivesForPlugin(incorrectDirectiveFiles)).toThrowError(
      'Please use `createValidatorDirective` or `createTransformerDirective` functions to define your directive',
    )
  })

  it('Tells you if you forgot the implementation function', () => {
    // @ts-expect-error - Testing JS scenario
    expect(() => createValidatorDirective(fooSchema, undefined)).toThrowError(
      'Directive validation function not implemented for @foo',
    )

    // @ts-expect-error - Testing JS scenario
    expect(() => createTransformerDirective(fooSchema, undefined)).toThrowError(
      'Directive transformer function not implemented for @foo',
    )
  })

  it('Tells you if you messed up the schema', () => {
    // The messages come from the graphql libs, so no need to check the messages
    expect(() =>
      createValidatorDirective(gql`directive @misdirective`, () => {}),
    ).toThrow()

    expect(() =>
      createTransformerDirective(gql`misdirective`, () => {}),
    ).toThrow()
  })
})
