import path from 'path'

import fs from 'fs-extra'

// The stack containing rollback actions
let rollback = []

/**
 * Adds a function call to the rollback stack, this function will be called when the rollback is executed
 *
 * @param {function} func - The function to call
 * @param {boolean} [atEnd=false] - If true inserts at the bottom of the stack instead of the top
 */
export function addFunctionToRollback(func, atEnd = false) {
  const step = { type: 'func', func: func }
  if (atEnd) {
    rollback.unshift(step)
  } else {
    rollback.push(step)
  }
}

/**
 * Adds a file call to the rollback stack, when the rollback is executed the file will deleted if it does not currently exist or will be restored to its current state
 *
 * @param {string} path - Path to the file
 * @param {boolean} [atEnd=false] - If true inserts at the bottom of the stack instead of the top
 */
export function addFileToRollback(path, atEnd = false) {
  const step = {
    type: 'file',
    path: path,
    content: fs.existsSync(path) ? fs.readFileSync(path) : null,
  }
  if (atEnd) {
    rollback.unshift(step)
  } else {
    rollback.push(step)
  }
}

/**
 * Executes a rollback by processing the contents of the rollback stack
 *
 * @param {object|null} [ctx=null] - The listr2 ctx
 * @param {object|null} [task=null] - The listr2 task
 */
export async function executeRollback(_ = null, task = null) {
  if (task) {
    task.title = 'Reverting generator actions...'
  }
  while (rollback.length > 0) {
    const step = rollback.pop()
    switch (step.type) {
      case 'func':
        await step.func()
        break
      case 'file':
        if (step.content === null) {
          fs.unlinkSync(step.path)
          // Remove any empty parent/grandparent directories, only need 2 levels so just do it manually
          let parent = path.dirname(step.path)
          if (parent !== '.' && fs.readdirSync(parent).length === 0) {
            fs.rmdirSync(parent)
          }
          parent = path.dirname(parent)
          if (parent !== '.' && fs.readdirSync(parent).length === 0) {
            fs.rmdirSync(parent)
          }
        } else {
          fs.writeFileSync(step.path, step.content)
        }
        break
      default:
        // This should be unreachable.
        break
    }
  }
  if (task) {
    task.title = `Reverted because: ${task.task.message.error}`
  }
}

/**
 * Clears the current rollback stack
 */
export function resetRollback() {
  rollback.length = 0
}

/**
 * Resets the current rollback stack and assigns all of the tasks to have a listr2 rollback function which call {@link executeRollback}
 */
export function prepareForRollback(tasks) {
  resetRollback()
  tasks.tasks?.forEach((task) => {
    task.task.rollback = executeRollback
  })
}
