import { buildCjs, buildEsm } from '@redwoodjs/framework-tools'
import {
  generateTypesCjs,
  generateTypesEsm,
  insertCommonJsPackageJson,
} from '@redwoodjs/framework-tools/generateTypes'

// ESM build and type generation
await buildEsm()
await generateTypesEsm()

// CJS build, type generation, and package.json insert
await buildCjs()
await generateTypesCjs()
await insertCommonJsPackageJson({
  buildFileUrl: import.meta.url,
})
