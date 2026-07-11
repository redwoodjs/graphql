import { buildExternalCjs, buildExternalEsm } from '@redwoodjs/framework-tools'
import {
  generateTypesCjs,
  generateTypesEsm,
  insertCommonJsPackageJson,
} from '@redwoodjs/framework-tools/generateTypes'

await buildExternalEsm()
await generateTypesEsm()

await buildExternalCjs()
await generateTypesCjs()

await insertCommonJsPackageJson({ buildFileUrl: import.meta.url })
