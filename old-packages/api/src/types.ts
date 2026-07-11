/**
 * Houses utility types commonly used on the api side
 */

import type { O, A } from 'ts-toolbelt'

/**
 * ---- Prisma SDL Type Merge ----
 * SDL is source of truth for KEYS
 * Prisma types is source of truth for VALUES (unless SDL-only field)
 */

type AnyObject = Record<string | symbol | number, unknown>
// Pick out unique keys on the SDL type
type SdlOnlyFields<TPrisma, TSdl> = Omit<TSdl, keyof TPrisma>

// Object with all the optional keys, so that we can make them nullable
type PrismaTypeWithOptionalKeysFromSdl<
  TPrisma extends AnyObject,
  TSdl extends AnyObject,
> = Pick<TPrisma, O.OptionalKeys<TSdl>>

// Make the optional values nullable
type PrismaTypeWithOptionalKeysAndNullableValues<
  TPrisma extends AnyObject,
  TSdl extends AnyObject,
> = {
  [k in keyof PrismaTypeWithOptionalKeysFromSdl<TPrisma, TSdl>]?:
    | PrismaTypeWithOptionalKeysFromSdl<TPrisma, TSdl>[k]
    | null // Note: if we ever change the type of Maybe in codegen, it might be worth changing this to Maybe<T>
}

// Object with all the required keys
type PrismaTypeWithRequiredKeysFromSdl<
  TPrisma extends AnyObject,
  TSdl extends AnyObject,
> = Pick<TPrisma, O.RequiredKeys<TSdl>>

// To replace the unknowns with types from Sdl on SDL-only fields
type OptionalsAndSdlOnly<
  TPrisma extends AnyObject,
  TSdl extends AnyObject,
> = PrismaTypeWithOptionalKeysAndNullableValues<TPrisma, TSdl> &
  SdlOnlyFields<TPrisma, TSdl>

export type MakeRelationsOptional<T, TAllMappedModels> = {
  //object with optional relation keys
  [key in keyof T as T[key] extends TAllMappedModels
    ? key
    : never]?: MakeRelationsOptional<T[key], TAllMappedModels>
} & {
  // object without the relation keys
  [key in keyof T as T[key] extends TAllMappedModels ? never : key]: T[key]
}

// ⚡ All together now
// Note: don't use O.Merge here, because it results in unknowns
export type MergePrismaWithSdlTypes<
  TPrisma extends AnyObject,
  TSdl extends AnyObject,
  TAllMappedModels,
> = A.Compute<
  OptionalsAndSdlOnly<TPrisma, MakeRelationsOptional<TSdl, TAllMappedModels>> &
    PrismaTypeWithRequiredKeysFromSdl<
      TPrisma,
      MakeRelationsOptional<TSdl, TAllMappedModels>
    >
>
// ---- Prisma SDL Type Merge ----
