import path from "path"

export function A () {
  return "A"
}

export function B () {
  return "B"
}

export function C () {
  return A() + B()
}

export function getPathSep () {
  return path.sep
}
