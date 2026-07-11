import fs from 'fs'
import path from 'path'

import semver from 'semver'

import { getPaths } from '@redwoodjs/project-config'

function getCorrespondingTag(
  version: string,
  distTags: Record<string, string>,
) {
  return Object.entries(distTags).find(([_, v]) => v === version)?.[0]
}

// NOTE: This only considers the package's engines.redwoodjs field and does not consider the package's dependencies,
//       devDependencies, or peerDependencies.
/**
 * Check if the package at the given version is compatible with the current version of the user's RedwoodJS project. This is
 * determined by checking if the package's engines.redwoodjs field intersects with the user's RedwoodJS version.
 *
 * If the preferred version is not compatible, the latest compatible version will be returned if one exists.
 */
export async function getCompatibilityData(
  packageName: string,
  preferredVersionOrTag: string,
) {
  // Get the project's version of RedwoodJS from the root package.json's @redwoodjs/core dev dependency
  const projectPackageJson = JSON.parse(
    fs.readFileSync(path.join(getPaths().base, 'package.json'), {
      encoding: 'utf8',
    }),
  )
  const projectRedwoodVersion =
    projectPackageJson.devDependencies['@redwoodjs/core']

  // Parse the version, we'll assume it's a tag if it's not a valid semver version
  const semverVersion = semver.parse(preferredVersionOrTag)
  const isUsingTag = semverVersion === null

  // Get the package information from NPM registry
  // Valid package names are URL safe so we can just slot it right in here
  const res = await fetch(`https://registry.npmjs.org/${packageName}`)
  const packument = await res.json()

  // Check if there was an error fetching the package's information
  if (packument.error !== undefined) {
    throw new Error(packument.error)
  }

  // Check if the package has the requested version/tag
  if (isUsingTag) {
    if (packument['dist-tags'][preferredVersionOrTag] === undefined) {
      throw new Error(
        `The package '${packageName}' does not have a tag '${preferredVersionOrTag}'`,
      )
    }
  } else {
    if (packument.versions[preferredVersionOrTag] === undefined) {
      throw new Error(
        `The package '${packageName}' does not have a version '${preferredVersionOrTag}'`,
      )
    }
  }

  // Determine the version to try to use, defaulting to the latest published version of the package
  const preferredVersion: string = isUsingTag
    ? packument['dist-tags'][preferredVersionOrTag]
    : preferredVersionOrTag

  // Extract the package's redwoodjs engine specification for the preferred version
  const packageRedwoodSpecification =
    packument.versions[preferredVersion].engines?.redwoodjs

  // We have to use the semver.intersects function because the package's redwoodjs engine could be a range
  if (
    packageRedwoodSpecification !== undefined &&
    semver.intersects(projectRedwoodVersion, packageRedwoodSpecification)
  ) {
    const tag = getCorrespondingTag(preferredVersion, packument['dist-tags'])
    return {
      preferred: {
        tag,
        version: preferredVersion,
      },
      compatible: {
        tag,
        version: preferredVersion,
      },
    }
  }

  // Look in the pacument for the latest version that is compatible with the current version of RedwoodJS
  const versions = semver.sort(Object.keys(packument.versions))
  for (let i = versions.length - 1; i >= 0; i--) {
    const redwoodVersionRequired =
      packument.versions[versions[i]].engines?.redwoodjs
    if (redwoodVersionRequired === undefined) {
      continue
    }
    if (semver.intersects(projectRedwoodVersion, redwoodVersionRequired)) {
      return {
        preferred: {
          tag: getCorrespondingTag(preferredVersion, packument['dist-tags']),
          version: preferredVersion,
        },
        compatible: {
          tag: getCorrespondingTag(versions[i], packument['dist-tags']),
          version: versions[i],
        },
      }
    }
  }

  // No compatible version was found
  throw new Error(`No compatible version of '${packageName}' was found`)
}
