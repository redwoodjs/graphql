import { buildCjs, buildEsm } from '@redwoodjs/framework-tools'
import {
  generateTypesCjs,
  generateTypesEsm,
  insertCommonJsPackageJson,
} from '@redwoodjs/framework-tools/generateTypes'

await buildEsm()
await generateTypesEsm()

await buildCjs()
await generateTypesCjs()

await insertCommonJsPackageJson({ buildFileUrl: import.meta.url })
