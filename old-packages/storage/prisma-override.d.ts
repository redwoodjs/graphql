// Locally, within this project we override the type for @prisma/client to the one we generate locally
// This is so that we get accurate types (rather than the default anys) - and when the prismaExtension runs
// it will still use the types from '@prisma/client' which points to the user's prisma client and not ours

import type { PrismaClient as LocalPrismaClient } from './src/__tests__/prisma-client/index.d.ts'

declare module '@prisma/client' {
  export class PrismaClient extends LocalPrismaClient {}
}
