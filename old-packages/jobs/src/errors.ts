const JOBS_CONFIG_FILENAME = 'jobs.{ts,js}'

/**
 * Parent class for any RedwoodJob-related error
 */
export class RedwoodJobError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when trying to configure a scheduler without an adapter
 */
export class AdapterNotConfiguredError extends RedwoodJobError {
  constructor() {
    super('No adapter configured for the job scheduler')
  }
}

/**
 * Thrown when the Worker or Executor is instantiated without an adapter
 */
export class AdapterRequiredError extends RedwoodJobError {
  constructor() {
    super('`adapter` is required to perform a job')
  }
}

/**
 * Thrown when the Worker is instantiated without an array of queues
 */
export class QueuesRequiredError extends RedwoodJobError {
  constructor() {
    super('`queues` is required to find a job to run')
  }
}

/**
 * Thrown when the Executor is instantiated without a job
 */
export class JobRequiredError extends RedwoodJobError {
  constructor() {
    super('`job` is required to perform a job')
  }
}

/**
 * Thrown when a job with the given handler is not found in the filesystem
 */
export class JobNotFoundError extends RedwoodJobError {
  constructor(name: string) {
    super(`Job \`${name}\` not found in the filesystem`)
  }
}

/**
 * Thrown when a job file exists, but the export does not match the filename
 */
export class JobExportNotFoundError extends RedwoodJobError {
  constructor(name: string) {
    super(`Job file \`${name}\` does not export a class with the same name`)
  }
}

/**
 * Thrown when the runner tries to import `adapter` from api/src/lib/jobs.js|ts and
 * the file does not exist
 */
export class JobsLibNotFoundError extends RedwoodJobError {
  constructor() {
    super(
      `api/src/lib/${JOBS_CONFIG_FILENAME} not found. Run \`yarn rw setup jobs\` to create this file and configure background jobs. Already did that? You'll need to run \`yarn rw dev\` or \`yarn rw build\` before you can start the job workers!`,
    )
  }
}

/**
 * Thrown when the runner tries to import `adapter` from api/src/lib/jobs.js|ts
 */
export class AdapterNotFoundError extends RedwoodJobError {
  constructor(name: string) {
    super(
      `api/src/lib/${JOBS_CONFIG_FILENAME} does not export an adapter named \`${name}\``,
    )
  }
}

/**
 * Thrown when the runner tries to import `logger` from api/src/lib/jobs.js|ts
 */
export class LoggerNotFoundError extends RedwoodJobError {
  constructor(name: string) {
    super(
      `api/src/lib/${JOBS_CONFIG_FILENAME} does not export a logger named \`${name}\``,
    )
  }
}

/**
 * Thrown when the runner tries to import `workerConfig` from api/src/lib/jobs.js|ts
 */
export class WorkerConfigNotFoundError extends RedwoodJobError {
  constructor(name: string) {
    super(`api/src/lib/#{JOBS_CONFIG_FILENAME} does not export \`${name}\``)
  }
}

/**
 * Parent class for any job error where we want to wrap the underlying error
 * in our own. Use by extending this class and passing the original error to
 * the constructor:
 *
 * ```typescript
 * try {
 *   throw new Error('Generic error')
 * } catch (e) {
 *    throw new RethrowJobError('Custom Error Message', e)
 * }
 * ```
 */
export class RethrownJobError extends RedwoodJobError {
  originalError: Error
  stackBeforeRethrow: string | undefined

  constructor(message: string, error: Error) {
    super(message)

    if (!error) {
      throw new Error(
        'RethrownJobError requires a message and existing error object',
      )
    }

    this.originalError = error
    this.stackBeforeRethrow = this.stack

    const messageLines = (this.message.match(/\n/g) || []).length + 1
    this.stack =
      this.stack
        ?.split('\n')
        .slice(0, messageLines + 1)
        .join('\n') +
      '\n' +
      error.stack
  }
}

/**
 * Thrown when there is an error scheduling a job, wraps the underlying error
 */
export class SchedulingError extends RethrownJobError {
  constructor(message: string, error: Error) {
    super(message, error)
  }
}

/**
 * Thrown when there is an error performing a job, wraps the underlying error
 */
export class PerformError extends RethrownJobError {
  constructor(message: string, error: Error) {
    super(message, error)
  }
}

export class QueueNotDefinedError extends RedwoodJobError {
  constructor() {
    super('Scheduler requires a named `queue` to place jobs in')
  }
}

export class WorkerConfigIndexNotFoundError extends RedwoodJobError {
  constructor(index: number) {
    super(`Worker index ${index} not found in jobs config`)
  }
}
