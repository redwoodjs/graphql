import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fg from 'fast-glob'

import { build, defaultIgnorePatterns } from '@redwoodjs/framework-tools'

await build()

// The CLI depends on assets like templates files
// that esbuild won't copy over. So we do it manually here.
// To test this, check in dist, and get used to using `find`.
async function copyAssets() {
  const cliRootDirPath = path.dirname(fileURLToPath(import.meta.url))
  const cliSrcDirPath = path.join(cliRootDirPath, 'src')
  const cliDistDirPath = path.join(cliRootDirPath, 'dist')

  let pathnames = await fg(
    [
      // Generators, etc.
      '**/*.template',
      // Docker
      '**/Dockerfile',
      '**/dockerignore',
      '**/*.yml',
    ],
    {
      absolute: true,
      cwd: cliSrcDirPath,
      ignore: defaultIgnorePatterns,
    },
  )

  // For Windows.
  pathnames = pathnames.map((p) => path.normalize(p))

  for (const pathname of pathnames) {
    const distPathname = pathname.replace(cliSrcDirPath, cliDistDirPath)

    try {
      await fs.cp(pathname, distPathname)
    } catch (error) {
      console.error(
        `Couldn't copy ${pathname} to ${distPathname}. ` +
          `(Replaced ${cliSrcDirPath} with ${cliDistDirPath} to get the dist pathname.)`,
      )
      throw error
    }
  }
}

await copyAssets()
