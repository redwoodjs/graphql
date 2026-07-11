import path from 'path'

import fs from 'fs-extra'

import { getPaths } from './index'

/**
 * Creates the ".redwood/locks" directory if it does not exist
 */
function ensureLockDirectoryExists() {
  const locksPath = path.join(getPaths().generated.base, 'locks')

  if (!fs.existsSync(locksPath)) {
    fs.mkdirSync(locksPath, { recursive: true })
  }
}

/**
 * Creates a lock with the specified identifier
 * @param {string} identifier ID of the lock
 * @throws Will throw an error if the lock is already set
 */
export function setLock(identifier) {
  ensureLockDirectoryExists()

  if (isLockSet(identifier)) {
    throw new Error(`Lock "${identifier}" is already set`)
  }

  fs.writeFileSync(
    path.join(getPaths().generated.base, 'locks', identifier),
    '',
  )
}

/**
 * Removes a lock with the specified identifier
 * @param {string} identifier ID of the lock
 */
export function unsetLock(identifier) {
  try {
    fs.rmSync(path.join(getPaths().generated.base, 'locks', identifier))
  } catch (error) {
    // If the lock doesn't exist it's okay to not throw an error
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

/**
 * Determines if a lock with the specified identifier is currently set
 * @param {string} identifier ID of the lock
 * @returns {boolean} `true` if the lock is set, otherwise `false`
 */
export function isLockSet(identifier) {
  const lockfilePath = path.join(getPaths().generated.base, 'locks', identifier)

  // Check if the lock file exists
  const exists = fs.existsSync(lockfilePath)
  if (!exists) {
    return false
  }

  // Ensure this lock isn't stale due to some error
  // Locks are only valid for 1 hour
  const createdAt = fs.statSync(lockfilePath).birthtimeMs
  if (Date.now() - createdAt > 3600000) {
    unsetLock(identifier)
    return false
  }

  // If the lock file exists and isn't stale, the lock is set
  return true
}

/**
 * Unsets a list of locks, when no identifiers are specified all existing locks are unset
 * @param {string[]} identifiers List of lock identifiers
 */
export function clearLocks(identifiers = []) {
  ensureLockDirectoryExists()

  if (identifiers.length > 0) {
    for (const id of identifiers) {
      unsetLock(id)
    }
  } else {
    const locks = fs.readdirSync(path.join(getPaths().generated.base, 'locks'))
    for (const lock of locks) {
      unsetLock(lock)
    }
  }
}
