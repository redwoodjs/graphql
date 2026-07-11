import type { A } from 'ts-toolbelt'

export type GenericParams = Record<string | number, string | number | boolean>

export type QueryParams = GenericParams

// @Note that '' is matched by ${string} so it still parses from the beginning.
export type RouteParams<Route> = Route extends `${string}/${infer Rest}`
  ? A.Compute<ParsedParams<Rest>>
  : GenericParams

export type ParamType<match> = match extends 'Int'
  ? number
  : match extends 'Boolean'
    ? boolean
    : match extends 'Float'
      ? number
      : string

// This is used for a specific case where the first param
// doesnt have a type, but second one does
// See comment above it's usage
type ParamsFromGreedyMatch<
  TParam extends string,
  TMatch extends string,
  TRest extends string,
> = {
  [ParamName in TParam as RemoveGlobDots<ParamName>]: string
} & ParsedParams<`${TRest}:${TMatch}}`> &
  ParsedParams<`${TRest}`>

// Note that this has to be first in the list, because it does greedy param checks
type TypedParamInFront<
  TParam extends string,
  TMatch extends string,
  TRest extends string,
> = TParam extends `${infer Param2}}/${infer Rest2}`
  ? // check for greedy match (basically if the param contains a slash in it)
    // e.g. in {b}/{c:Int} it matches b}/{c as the param
    // Rest2 = {c, Match = Int so we reconstruct the old one {c + : + Int + }
    ParamsFromGreedyMatch<Param2, TMatch, Rest2>
  : // Otherwise its a regular match
    {
      [ParamName in TParam]: ParamType<TMatch>
    } & ParsedParams<`${TRest}`>

// This is the second part of greedy match
// has type, but at the end e.g. {d:Int} or d:Int} <-- no opening brace
// Needs to be right after TypedParamInFront
type TypedParamAtEnd<
  TParam extends string,
  TMatch extends string,
> = TParam extends `${infer Param2}}/${infer Rest2}`
  ? {
      [ParamName in Param2]: string
    } & ParsedParams<`${Rest2}:${TMatch}}`>
  : { [ParamName in TParam]: ParamType<TMatch> }

// This mapper takes a param name and will remove dots if its a glob
// e.g. fromDate... -> fromDate
// Only used when the param doesn't have a type, because glob params dont have types
type RemoveGlobDots<Param> = Param extends `${infer GlobParamName}...`
  ? GlobParamName
  : Param

// no type, but has stuff after it, e.g. {c}/{d} or {c}/bazinga
type MultiParamsWithoutType<TParam extends string, TRest extends string> = {
  [ParamName in TParam as RemoveGlobDots<ParamName>]: string
} & ParsedParams<`${TRest}`>

type JustParamNoType<TParam extends string> = {
  [ParamName in TParam as RemoveGlobDots<ParamName>]: string
}

// Path string parser for Redwood Routes
type ParsedParams<PartialRoute> =
  //   : // {a:Int}/[...moar]
  PartialRoute extends `${string}{${infer Param}:${infer Match}}${string}/${infer Rest}`
    ? TypedParamInFront<Param, Match, Rest>
    : // has type, but at the end e.g. {d:Int}
      PartialRoute extends `${string}{${infer Param}:${infer Match}}${string}`
      ? // Greedy match order 2
        TypedParamAtEnd<Param, Match>
      : // no type, but has stuff after it, e.g. {c}/{d} or {c}/bazinga
        PartialRoute extends `${string}{${infer Param}}${string}/${infer Rest}`
        ? MultiParamsWithoutType<Param, Rest>
        : // last one with no type e.g. {d} - just a param
          PartialRoute extends `${string}{${infer Param}}${string}`
          ? JustParamNoType<Param>
          : // if there's a non param
            PartialRoute extends `${string}/${infer Rest}`
            ? ParsedParams<`${Rest}`>
            : // Fallback when doesn't match any of these
              GenericParams

/**
 * Translation in pseudocode without ternaries
 *
if ('he{c:Int}lo/...rest') {
  checkForGreedyMatch()
} else if ('he{c:Int}lo') {
  typedParamAtEnd()
} else if ('he{c}yo/...rest') {
  multipleParamsNoTypes()
} else if('he{d}yo') {
  justParamNoType()
} else if ('bazinga/..rest') {
  // Call itself
  parseParamsRecursiveCall(rest)
} else{
  // fallback, because it doesn't match any of the above
  GenericParams
}

Its a bit odd, but the he{d}llo  is a form we support in the router
// e.g. /signedUp/e{status:Boolean}y
**/
