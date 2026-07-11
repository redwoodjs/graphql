import { vol } from 'memfs'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ensurePosixPath } from '@redwoodjs/project-config'

import { FileSystemStorage } from './FileSystemStorage.js'

// Mock the entire fs module
vi.mock('node:fs', async () => {
  const memfs = await import('memfs')
  return {
    ...memfs.fs,
    default: memfs.fs,
  }
})

// Mock the fs/promises module
vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs')
  return {
    ...memfs.fs.promises,
    default: memfs.fs.promises,
  }
})

describe('FileSystemStorage', () => {
  let storage: FileSystemStorage
  const baseDir = '/tmp/test_uploads'

  beforeEach(() => {
    vol.reset()
    // Avoiding printing on stdout
    vi.spyOn(console, 'log').mockImplementation(() => {})

    storage = new FileSystemStorage({ baseDir })
  })

  const plainFile = new File(['test content'], 'test.txt', {
    type: 'text/plain',
  })

  test('save should store a file on the file system', async () => {
    const result = await storage.save(plainFile)

    expect(result).toHaveProperty('location')
    const posixLocation = ensurePosixPath(result.location)
    expect(posixLocation).toMatch(/\/tmp\/test_uploads\/.*\.txt$/)
    expect(vol.existsSync(result.location)).toBe(true)
  })

  test('remove should delete a file fron ', async () => {
    const { location } = await storage.save(plainFile)

    await storage.remove(location)
    expect(vol.existsSync(location)).toBe(false)
  })

  test('read should return file contents and type', async () => {
    const { location: plainFileLocation } = await storage.save(plainFile)

    const plainFileReadResult = await storage.read(plainFileLocation)
    expect(plainFileReadResult.contents).toBeInstanceOf(Buffer)
    expect(plainFileReadResult.contents.toString()).toBe('test content')
    expect(plainFileReadResult.type).toBe('text/plain')

    const imageFile = new File(['ABCDEF'], 'test.png', { type: 'image/png' })
    const { location } = await storage.save(imageFile)

    const result = await storage.read(location)
    expect(result.contents).toBeInstanceOf(Buffer)
    expect(result.contents.toString()).toBe('ABCDEF')
    expect(result.type).toBe('image/png')
  })

  test('save should use custom path, with no baseDir, when provided', async () => {
    // Note that using a custom path means you need to create the directory yourself!
    vol.mkdirSync('/my_custom/path', { recursive: true })

    const result = await storage.save(plainFile, {
      path: '/my_custom/path',
      fileName: 'bazinga',
    })

    // Note that it doesn't have the baseDir!
    expect(ensurePosixPath(result.location)).toEqual(
      '/my_custom/path/bazinga.txt',
    )
    expect(vol.existsSync(result.location)).toBe(true)
  })
})
