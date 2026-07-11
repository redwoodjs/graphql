globalThis.__dirname = __dirname
import path from 'path'

import { vol } from 'memfs'
import { vi, describe, beforeAll, test, expect } from 'vitest'

// Load mocks
import '../../../../lib/test'

import { getDefaultArgs } from '../../../../lib'
import { yargsDefaults as defaults } from '../../helpers'
import * as scaffold from '../scaffold'

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))
vi.mock('execa')

describe('relational form field', () => {
  let form

  beforeAll(async () => {
    vol.fromJSON({ 'redwood.toml': '' }, '/')
    const files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Tag',
      tests: true,
      nestScaffoldByModel: true,
    })

    const tagFormPath =
      '/path/to/project/web/src/components/Tag/TagForm/TagForm.jsx'
    form = files[path.normalize(tagFormPath)]
  })

  test("includes optional relational fields with an emptyAs('undefined')", () => {
    expect(form).toMatch("emptyAs={'undefined'}")
  })
})
