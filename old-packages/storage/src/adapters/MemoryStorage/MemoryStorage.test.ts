import { describe, expect, test } from 'vitest'

import { ensurePosixPath } from '@redwoodjs/project-config'

import { MemoryStorage } from './MemoryStorage.js'

describe('MemoryStorage', () => {
  const storage = new MemoryStorage({ baseDir: 'uploads' })

  test('save should store a file in memory', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const result = await storage.save(file)

    expect(result).toHaveProperty('location')
    expect(ensurePosixPath(result.location)).toMatch(/uploads\/.*\.txt$/)
    expect(storage.store[result.location]).toBeDefined()
  })

  test('read should return file contents and type', async () => {
    const file = new File(['ABCDEF'], 'test.txt', { type: 'image/png' })
    const { location } = await storage.save(file)

    const result = await storage.read(location)
    expect(result.contents).toBeInstanceOf(Buffer)
    expect(result.contents.toString()).toBe('ABCDEF')
    expect(result.type).toBe('image/png')
  })

  test('remove should delete a file from memory', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const { location } = await storage.save(file)

    await storage.remove(location)
    expect(storage.store[location]).toBeUndefined()
  })

  test('read should return file contents and type', async () => {
    const file = new File(['ABCDEF'], 'test.txt', { type: 'image/png' })
    const { location } = await storage.save(file)

    const result = await storage.read(location)
    expect(result.contents).toBeInstanceOf(Buffer)
    expect(result.contents.toString()).toBe('ABCDEF')
    expect(result.type).toBe('image/png')
  })

  test('clear should remove all stored files', async () => {
    const file1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' })
    const file2 = new File(['content 2'], 'file2.txt', { type: 'text/plain' })

    await storage.save(file1)
    await storage.save(file2)

    await storage.clear()
    expect(Object.keys(storage.store).length).toBe(0)
  })

  test('save should use custom path when provided', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const result = await storage.save(file, { path: 'custom/path' })

    expect(ensurePosixPath(result.location)).toContain('custom/path')
  })
})
