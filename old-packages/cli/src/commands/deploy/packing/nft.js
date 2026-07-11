import path from 'path'

import { nodeFileTrace } from '@vercel/nft'
import archiver from 'archiver'
import fse from 'fs-extra'

import { findApiDistFunctions } from '@redwoodjs/internal/dist/files'
import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import * as nftPacker from '../packing/nft'

const ZIPBALL_DIR = './api/dist/zipball'

export function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 5 } })
  const stream = fse.createWriteStream(out)

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', (err) => reject(err))
      .pipe(stream)

    stream.on('close', () => resolve())
    archive.finalize()
  })
}

// returns a tuple of [filePath, fileContent]
export function generateEntryFile(functionAbsolutePath, name) {
  const relativeImport = ensurePosixPath(
    path.relative(getPaths().base, functionAbsolutePath),
  )
  return [
    `${ZIPBALL_DIR}/${name}/${name}.js`,
    `module.exports = require('./${relativeImport}')`,
  ]
}

export async function packageSingleFunction(functionFile) {
  const { name: functionName } = path.parse(functionFile)

  const { fileList: functionDependencyFileList } = await nodeFileTrace([
    functionFile,
  ])
  const copyPromises = []
  for (const singleDependencyPath of functionDependencyFileList) {
    copyPromises.push(
      fse.copy(
        './' + singleDependencyPath,
        `${ZIPBALL_DIR}/${functionName}/${singleDependencyPath}`,
      ),
    )
  }

  const [entryFilePath, content] = generateEntryFile(functionFile, functionName)

  // This generates an "entry" file, that just proxies the actual
  // function that is nested in api/dist/
  const functionEntryPromise = fse.outputFile(entryFilePath, content)
  copyPromises.push(functionEntryPromise)

  await Promise.all(copyPromises)
  await zipDirectory(
    `${ZIPBALL_DIR}/${functionName}`,
    `${ZIPBALL_DIR}/${functionName}.zip`,
  )
  await fse.remove(`${ZIPBALL_DIR}/${functionName}`)
  return
}

export function nftPack() {
  const filesToBePacked = findApiDistFunctions()
  return Promise.all(filesToBePacked.map(nftPacker.packageSingleFunction))
}
