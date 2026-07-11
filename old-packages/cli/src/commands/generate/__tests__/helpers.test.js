import path from 'path'

import fs from 'fs-extra'
import { vi, test, expect, describe, it } from 'vitest'

// Setup test mocks
globalThis.__dirname = __dirname
import '../../../lib/test'

import * as helpers from '../helpers'
import * as page from '../page/page'

test('customOrDefaultTemplatePath returns the default path if no custom templates exist', () => {
  const output = helpers.customOrDefaultTemplatePath({
    side: 'web',
    generator: 'page',
    templatePath: 'page.tsx.template',
  })

  expect(output).toMatch(
    path.normalize(
      '/packages/cli/src/commands/generate/page/templates/page.tsx.template',
    ),
  )
})

test('customOrDefaultTemplatePath returns the app path if a custom template exists', () => {
  // pretend the custom template exists
  vi.spyOn(fs, 'existsSync').mockImplementationOnce(() => true)

  const output = helpers.customOrDefaultTemplatePath({
    side: 'web',
    generator: 'page',
    templatePath: 'page.tsx.template',
  })

  expect(output).toEqual(
    path.normalize('/path/to/project/web/generators/page/page.tsx.template'),
  )
})

test('customOrDefaultTemplatePath returns the app path with proper side, generator and path', () => {
  // pretend the custom template exists
  vi.spyOn(fs, 'existsSync').mockImplementationOnce(() => true)

  const output = helpers.customOrDefaultTemplatePath({
    side: 'api',
    generator: 'cell',
    templatePath: 'component.tsx.template',
  })

  expect(output).toEqual(
    path.normalize(
      '/path/to/project/api/generators/cell/component.tsx.template',
    ),
  )
})

test('templateForComponentFile creates a proper output path for files', async () => {
  const names = ['FooBar', 'fooBar', 'foo-bar', 'foo_bar']

  for (const name of names) {
    const output = await helpers.templateForComponentFile({
      name: name,
      suffix: 'Page',
      webPathSection: 'pages',
      generator: 'page',
      templatePath: 'page.tsx.template',
      templateVars: {
        ...page.paramVariants(helpers.pathName(undefined, name)),
        rscEnabled: false,
      },
    })

    expect(output[0]).toEqual(
      path.normalize('/path/to/project/web/src/pages/FooBarPage/FooBarPage.js'),
    )
  }
})

test('templateForComponentFile creates a proper output path for files with all caps in component name', async () => {
  const names = ['FOO_BAR', 'FOO-BAR', 'FOOBAR']

  for (const name of names) {
    const output = await helpers.templateForComponentFile({
      name: name,
      suffix: 'Page',
      webPathSection: 'pages',
      generator: 'page',
      templatePath: 'page.tsx.template',
      templateVars: {
        ...page.paramVariants(helpers.pathName(undefined, name)),
        rscEnabled: false,
      },
    })

    expect(output[0]).toEqual(
      path.normalize('/path/to/project/web/src/pages/FOOBARPage/FOOBARPage.js'),
    )
  }
})

test('templateForComponentFile creates a proper output path for files for starting with uppercase and ending with lowercase', async () => {
  const names = ['FOOBar', 'FOO-Bar', 'FOO_Bar']

  for (const name of names) {
    const output = await helpers.templateForComponentFile({
      name: name,
      suffix: 'Page',
      webPathSection: 'pages',
      generator: 'page',
      templatePath: 'page.tsx.template',
      templateVars: {
        ...page.paramVariants(helpers.pathName(undefined, name)),
        rscEnabled: false,
      },
    })

    expect(output[0]).toEqual(
      path.normalize('/path/to/project/web/src/pages/FOOBarPage/FOOBarPage.js'),
    )
  }
})

test('templateForComponentFile creates a proper output path for files with uppercase after special characters in component name', async () => {
  const names = ['ABtest', 'aBtest', 'a-Btest', 'a_Btest']

  for (const name of names) {
    const output = await helpers.templateForComponentFile({
      name: name,
      suffix: 'Page',
      webPathSection: 'pages',
      generator: 'page',
      templatePath: 'page.tsx.template',
      templateVars: {
        ...page.paramVariants(helpers.pathName(undefined, name)),
        rscEnabled: false,
      },
    })

    expect(output[0]).toEqual(
      path.normalize('/path/to/project/web/src/pages/ABtestPage/ABtestPage.js'),
    )
  }
})

test('templateForComponentFile can create a path in /web', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'Home',
    suffix: 'Page',
    webPathSection: 'pages',
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      ...page.paramVariants(helpers.pathName(undefined, 'Home')),
      rscEnabled: false,
    },
  })

  expect(output[0]).toEqual(
    path.normalize('/path/to/project/web/src/pages/HomePage/HomePage.js'),
  )
})

test('templateForComponentFile can create a path in /api', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'Home',
    suffix: 'Page',
    apiPathSection: 'services',
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      ...page.paramVariants(helpers.pathName(undefined, 'Home')),
      rscEnabled: false,
    },
  })

  expect(output[0]).toEqual(
    path.normalize('/path/to/project/api/src/services/HomePage/HomePage.js'),
  )
})

test('templateForComponentFile can override generated component name', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'Home',
    componentName: 'Hobbiton',
    webPathSection: 'pages',
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      ...page.paramVariants(helpers.pathName(undefined, 'Home')),
      rscEnabled: false,
    },
  })

  expect(output[0]).toEqual(
    path.normalize('/path/to/project/web/src/pages/Hobbiton/Hobbiton.js'),
  )
})

test('templateForComponentFile can override file extension', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'Home',
    suffix: 'Page',
    extension: '.txt',
    webPathSection: 'pages',
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      ...page.paramVariants(helpers.pathName(undefined, 'Home')),
      rscEnabled: false,
    },
  })

  expect(output[0]).toEqual(
    path.normalize('/path/to/project/web/src/pages/HomePage/HomePage.txt'),
  )
})

test('templateForComponentFile can override output path', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'func',
    apiPathSection: 'functions',
    generator: 'function',
    templatePath: 'function.ts.template',
    templateVars: { name: 'func', typescript: false },
    outputPath: path.normalize('/path/to/project/api/src/functions/func.ts'),
  })

  expect(output[0]).toEqual(
    path.normalize('/path/to/project/api/src/functions/func.ts'),
  )
})

test('templateForComponentFile creates a template', async () => {
  const output = await helpers.templateForComponentFile({
    name: 'FooBar',
    suffix: 'Page',
    webPathSection: 'pages',
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      ...page.paramVariants(helpers.pathName(undefined, 'fooBar')),
      rscEnabled: false,
    },
  })

  expect(output[1]).toMatchInlineSnapshot(`
    "// import { Link, routes } from '@redwoodjs/router'
    import { Metadata } from '@redwoodjs/web'

    const FooBarPage = () => {
      return (
        <>
          <Metadata title="FooBar" description="FooBar page" />

          <h1>FooBarPage</h1>
          <p>
            Find me in <code>./web/src/pages/FooBarPage/FooBarPage.js</code>
          </p>
          {/*
              My default route is named \`fooBar\`, link to me with:
              \`<Link to={routes.fooBar()}>FooBar</Link>\`
          */}
        </>
      )
    }

    export default FooBarPage
    "
  `)
})

test('pathName uses passed path if present', () => {
  const paths = ['FooBar', 'fooBar', 'foo-bar', 'foo_bar', 'foobar', '/foobar']

  paths.forEach((path) => {
    expect(helpers.pathName(path, 'FooBar')).toEqual(path)
  })
})

test('pathName creates path based on name if path is null', () => {
  const names = ['FooBar', 'fooBar', 'foo-bar', 'foo_bar', 'FOO_BAR']

  names.forEach((name) => {
    expect(helpers.pathName(null, name)).toEqual('/foo-bar')
  })
})

test('pathName creates path based on name if path is just a route parameter', () => {
  expect(helpers.pathName('{id}', 'post')).toEqual('/post/{id}')
  expect(helpers.pathName('{id:Int}', 'post')).toEqual('/post/{id:Int}')
})

test('pathName supports paths with route params', () => {
  expect(helpers.pathName('/post/{id:Int}/edit', 'EditPost')).toEqual(
    '/post/{id:Int}/edit',
  )
})

test('relationsForModel returns related field names from a belongs-to relationship', () => {
  const model = {
    name: 'UserProfile',
    isEmbedded: false,
    dbName: null,
    fields: [
      {
        name: 'id',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: true,
        type: 'Int',
        default: [Object],
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'userId',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'Int',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'user',
        kind: 'object',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'User',
        relationName: 'UserToUserProfile',
        relationToFields: [Array],
        relationOnDelete: 'NONE',
        isGenerated: false,
        isUpdatedAt: false,
      },
    ],
    isGenerated: false,
    idFields: [],
    uniqueFields: [],
  }

  expect(helpers.relationsForModel(model)).toEqual(['user'])
})

test('relationsForModel returns related field names from a has-many relationship', () => {
  const model = {
    name: 'User',
    isEmbedded: false,
    dbName: null,
    fields: [
      {
        name: 'id',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: true,
        type: 'Int',
        default: [Object],
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'name',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: false,
        isUnique: false,
        isId: false,
        type: 'String',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'profiles',
        kind: 'object',
        dbNames: [],
        isList: true,
        isRequired: false,
        isUnique: false,
        isId: false,
        type: 'UserProfile',
        relationName: 'UserToUserProfile',
        relationToFields: [],
        relationOnDelete: 'NONE',
        isGenerated: false,
        isUpdatedAt: false,
      },
    ],
    isGenerated: false,
    idFields: [],
    uniqueFields: [],
  }

  expect(helpers.relationsForModel(model)).toEqual(['profiles'])
})

test('intForeignKeysForModel returns names of foreign keys that are Int datatypes', () => {
  const model = {
    name: 'UserProfile',
    isEmbedded: false,
    dbName: null,
    fields: [
      {
        name: 'id',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: true,
        type: 'Int',
        default: [Object],
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'userId',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'Int',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'user',
        kind: 'object',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'User',
        relationName: 'UserToUserProfile',
        relationToFields: [Array],
        relationOnDelete: 'NONE',
        isGenerated: false,
        isUpdatedAt: false,
      },
    ],
    isGenerated: false,
    idFields: [],
    uniqueFields: [],
  }

  expect(helpers.intForeignKeysForModel(model)).toEqual(['userId'])
})

test('intForeignKeysForModel does not include foreign keys of other datatypes', () => {
  const model = {
    name: 'UserProfile',
    isEmbedded: false,
    dbName: null,
    fields: [
      {
        name: 'id',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: true,
        type: 'Int',
        default: [Object],
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'userId',
        kind: 'scalar',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'String',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'user',
        kind: 'object',
        dbNames: [],
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        type: 'User',
        relationName: 'UserToUserProfile',
        relationToFields: [Array],
        relationOnDelete: 'NONE',
        isGenerated: false,
        isUpdatedAt: false,
      },
    ],
    isGenerated: false,
    idFields: [],
    uniqueFields: [],
  }

  expect(helpers.intForeignKeysForModel(model)).toEqual([])
})

describe('mapRouteParamTypeToTsType', () => {
  it('maps scalar type String to TS type string', () => {
    expect(helpers.mapRouteParamTypeToTsType('String')).toBe('string')
  })

  it('maps scalar type Boolean to TS type boolean', () => {
    expect(helpers.mapRouteParamTypeToTsType('Boolean')).toBe('boolean')
  })

  it('maps scalar type Int to TS type number', () => {
    expect(helpers.mapRouteParamTypeToTsType('Int')).toBe('number')
  })

  it('maps scalar type Float to TS type number', () => {
    expect(helpers.mapRouteParamTypeToTsType('Float')).toBe('number')
  })

  it('maps unexpected type to TS unknown', () => {
    expect(helpers.mapRouteParamTypeToTsType('unknown')).toBe('unknown')
  })
})

describe('mapPrismaScalarToPagePropTsType', () => {
  it('maps scalar type String to TS type string', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('String')).toBe('string')
  })

  it('maps scalar type Boolean to TS type boolean', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Boolean')).toBe('boolean')
  })

  it('maps scalar type Int to TS type number', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Int')).toBe('number')
  })

  it('maps scalar type BigInt to TS type number', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('BigInt')).toBe('number')
  })

  it('maps scalar type Float to TS type number', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Float')).toBe('number')
  })

  it('maps scalar type Decimal to TS type number', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Decimal')).toBe('number')
  })

  it('maps scalar type DateTime to TS type string', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('DateTime')).toBe('string')
  })

  it('maps scalar type Bytes to TS type Buffer', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Bytes')).toBe('Buffer')
  })

  it('maps all other type not-known to TS to unknown', () => {
    expect(helpers.mapPrismaScalarToPagePropTsType('Json')).toBe('unknown')
  })
})

describe('validateName', () => {
  it('throws an error if name starts with an invalid character', () => {
    expect(() => helpers.validateName('/')).toThrow()
    expect(() => helpers.validateName('/foo')).toThrow()
    expect(() => helpers.validateName('.foo')).toThrow()
    expect(() => helpers.validateName(',foo')).toThrow()
    expect(() => helpers.validateName('-foo')).toThrow()
  })
  it('does nothing if name is valid', () => {
    expect(() => helpers.validateName('foo')).not.toThrow()
    expect(() => helpers.validateName('foo/')).not.toThrow()
    expect(() => helpers.validateName('_foo')).not.toThrow()
    expect(() => helpers.validateName('1foo')).not.toThrow()
    expect(() => helpers.validateName('foo/bar')).not.toThrow()
    expect(() => helpers.validateName('foo.bar')).not.toThrow()
    expect(() => helpers.validateName('foo,bar')).not.toThrow()
    expect(() => helpers.validateName('foo-bar')).not.toThrow()
  })
})
