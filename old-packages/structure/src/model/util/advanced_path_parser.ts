/**
 * A route path parser with positional information.
 * Used to enable decorations
 * @param route
 */
export function advanced_path_parser(route: string) {
  const paramRanges: [number, number][] = []
  const paramTypeRanges: [number, number][] = []
  for (const param of route.matchAll(/\{([^}]+)\}/g)) {
    const [paramName, paramType] = param[1].split(':')
    const index = param.index + 1
    paramRanges.push([index, index + paramName.length])
    if (paramType) {
      const typeIndex = index + paramName.length + 2
      paramTypeRanges.push([typeIndex, typeIndex + paramType.length])
    }
  }
  const punctuationIndexes = [...route.matchAll(/[{}:]/g)].map((x) => x.index)
  const slashIndexes = [...route.matchAll(/[\/]/g)].map((x) => x.index)
  return { punctuationIndexes, slashIndexes, paramRanges, paramTypeRanges }
}
