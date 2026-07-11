import { resolve, join } from 'path'

import { describe, test, expect } from 'vitest'

import { process_env_findInFile, process_env_findAll } from '../process_env'

describe('process_env_findInFile', () => {
  test('can find process.env.FOO', () => {
    const code = `
    function sayHello(){
      console.log(process.env.FOO)
    }
    `
    const r = process_env_findInFile('file1.ts', code)
    expect(r.length).toEqual(1)
    expect(r[0].key).toEqual('FOO')
  })
  test('can find process.env["FOO"]', () => {
    const code = `
    function sayHello(){
      console.log(process.env["FOO"])
    }
    `
    const r = process_env_findInFile('file1.ts', code)
    expect(r.length).toEqual(1)
    expect(r[0].key).toEqual('FOO')
  })
  test('can skip process.env expressions in comments/trivia/strings', () => {
    const code = `
    function sayHello(){
      const x = "  process.env"
      // console.log(process.env["FOO"])
    }
    `
    const r = process_env_findInFile('file1.ts', code)
    expect(r.length).toEqual(0)
  })

  test('process_env_findAll', () => {
    const pp = getFixtureDir('example-todo-main-with-errors')
    //const webRoot = join(pp, 'web')
    const apiRoot = join(pp, 'api')
    process_env_findAll(apiRoot)
  })
})

function getFixtureDir(
  name: 'example-todo-main-with-errors' | 'example-todo-main',
) {
  return resolve(__dirname, `../../../../../../__fixtures__/${name}`)
}
