import { sep } from 'path'

import { describe, it, expect } from 'vitest'

import { URL_file, URL_toFile } from '../URL'

describe('URL_fromFile', () => {
  it('works for windows style paths', () => {
    expect(URL_file(`\\a\\b.c`)).toEqual('file:///a/b.c')
    expect(URL_file(`\\a\\b.c`)).toEqual('file:///a/b.c')
    expect(URL_file(`C:\\a`, `b.c`)).toEqual('file:///C:/a/b.c')
  })
  it('works for linux style paths', () => {
    expect(URL_file(`/a/b.c`)).toEqual('file:///a/b.c')
    expect(URL_file(`/a`, 'b.c')).toEqual('file:///a/b.c')
  })
  it('works with file:// URLs', () => {
    expect(URL_file('file:///a/b.c')).toEqual('file:///a/b.c')
    expect(URL_file(`file:///a`, 'b.c')).toEqual('file:///a/b.c')
  })
})

describe('URL_toFile', () => {
  it('works', () => {
    const res = `${sep}a${sep}b.c`
    expect(URL_toFile(`/a/b.c`)).toEqual(res)
    expect(URL_toFile(`file:///a/b.c`)).toEqual(res)
  })
  it('works with urlencoded windows file URLs (vscode language server does it this way)', () => {
    expect(URL_toFile(`file:///c%3A/a/b.c`, '\\')).toEqual('c:\\a\\b.c')
  })
})
