// Used by the job runner to find the next job to run and invoke the Executor

import { setTimeout } from 'node:timers'

import type { BaseAdapter } from '../adapters/BaseAdapter/BaseAdapter.js'
import {
  DEFAULT_DELETE_FAILED_JOBS,
  DEFAULT_DELETE_SUCCESSFUL_JOBS,
  DEFAULT_LOGGER,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RUNTIME,
  DEFAULT_SLEEP_DELAY,
} from '../consts.js'
import { AdapterRequiredError, QueuesRequiredError } from '../errors.js'
import type { BasicLogger, WorkerSharedOptions } from '../types.js'

import { Executor } from './Executor.js'

export interface WorkerOptions extends WorkerSharedOptions {
  // required

  adapter: BaseAdapter
  /** Used to set the `lockedBy` field in the database */
  processName: string
  /** If not given a queue name then will work on jobs in any queue */
  queues: string[]

  // optional

  logger?: BasicLogger
  /** If true, will clear the queue of all jobs and then exit */
  clear?: boolean

  /**
   * Set to `false` and the work loop will quit when the current job is done
   * running (regardless of how many outstanding jobs there are to be worked
   * on). The worker process will set this to `false` as soon as the user hits
   * ctrl-c so any current job will complete before exiting.
   */
  workoff?: boolean

  /**
   * If set to `true` will run the worker forever looking for new jobs. Otherwise
   * will only look for jobs one time and then exit.
   *
   * Useful for testing to avoid infinite loops!
   */
  forever?: boolean
}

type CompleteOptions = Required<WorkerOptions>

const DEFAULT_OPTIONS = {
  logger: DEFAULT_LOGGER,
  clear: false,
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  maxRuntime: DEFAULT_MAX_RUNTIME,
  deleteSuccessfulJobs: DEFAULT_DELETE_SUCCESSFUL_JOBS,
  deleteFailedJobs: DEFAULT_DELETE_FAILED_JOBS,
  sleepDelay: DEFAULT_SLEEP_DELAY,
  workoff: false,
  forever: true,
}

export class Worker {
  options: CompleteOptions
  adapter: CompleteOptions['adapter']
  logger: CompleteOptions['logger']
  clear: CompleteOptions['clear']
  processName: CompleteOptions['processName']
  queues: CompleteOptions['queues']
  maxAttempts: CompleteOptions['maxAttempts']
  maxRuntime: CompleteOptions['maxRuntime']
  deleteSuccessfulJobs: CompleteOptions['deleteSuccessfulJobs']
  deleteFailedJobs: CompleteOptions['deleteFailedJobs']
  sleepDelay: CompleteOptions['sleepDelay']
  forever: CompleteOptions['forever']
  workoff: CompleteOptions['workoff']
  lastCheckTime: Date

  constructor(options: WorkerOptions) {
    // Note: if we did a simple spread like { ...DEFAULT_OPTIONS, ...options } then any undefined values in `options`
    // would override the defaults. We want to keep the defaults if the value is `undefined` so we have to do this
    const nonUndefinedOptions = Object.fromEntries(
      Object.entries(options ?? {}).filter(([_, value]) => value !== undefined),
    )
    this.options = {
      ...DEFAULT_OPTIONS,
      ...nonUndefinedOptions,
      adapter: options?.adapter,
      processName: options?.processName,
      queues: options?.queues,
    }

    if (!options?.adapter) {
      throw new AdapterRequiredError()
    }

    if (!options?.queues || options.queues.length === 0) {
      throw new QueuesRequiredError()
    }

    this.adapter = this.options.adapter
    this.logger = this.options.logger

    // if true, will clear the queue of all jobs and then exit
    this.clear = this.options.clear

    // used to set the `lockedBy` field in the database
    this.processName = this.options.processName

    // if not given a queue name then will work on jobs in any queue
    this.queues = this.options.queues

    // the maximum number of times to retry a failed job
    this.maxAttempts = this.options.maxAttempts

    // the maximum amount of time to let a job run in seconds
    this.maxRuntime = this.options.maxRuntime

    // whether to keep succeeded jobs in the database
    this.deleteSuccessfulJobs = this.options.deleteSuccessfulJobs

    // whether to keep failed jobs in the database after reaching maxAttempts
    this.deleteFailedJobs = this.options.deleteFailedJobs

    // the amount of time to wait in milliseconds between checking for jobs.
    // the time it took to run a job is subtracted from this time, so this is a
    // maximum wait time.
    // To handle both 0 and `undefined` we do the `?? DEFAULT_OPTIONS` thing
    this.sleepDelay =
      (this.options.sleepDelay ?? DEFAULT_OPTIONS.sleepDelay) * 1000

    // Set to `false` and the work loop will quit when the current job is done
    // running (regardless of how many outstanding jobs there are to be worked
    // on). The worker process will set this to `false` as soon as the user hits
    // ctrl-c so any current job will complete before exiting.
    this.forever = this.options.forever

    // Set to `true` if the work loop should run through all *available* jobs
    // and then quit. Serves a slightly different purpose than `forever` which
    // makes the runner exit immediately after the next loop, where as `workoff`
    // doesn't exit the loop until there are no more jobs to work on.
    this.workoff = this.options.workoff

    // keep track of the last time we checked for jobs
    this.lastCheckTime = new Date()
  }

  // Workers run forever unless:
  // `this.forever` to false (loop only runs once, then exits)
  // `this.workoff` is true (run all jobs in the queue, then exits)
  run() {
    if (this.clear) {
      return this.#clearQueue()
    } else {
      return this.#work()
    }
  }

  get queueNames() {
    if (this.queues.length === 1 && this.queues[0] === '*') {
      return 'all (*)'
    } else {
      return this.queues.join(', ')
    }
  }

  async #clearQueue() {
    return await this.adapter.clear()
  }

  async #work() {
    do {
      this.lastCheckTime = new Date()

      this.logger.debug(
        `[${this.processName}] Checking for jobs in ${this.queueNames} queues...`,
      )

      const job = await this.adapter.find({
        processName: this.processName,
        maxRuntime: this.maxRuntime,
        queues: this.queues,
      })

      if (job) {
        // TODO add timeout handling if a job runs for more than
        // `this.maxRuntime`. Will need to run Executor in a separate process
        // with a timeout for this to work
        await new Executor({
          adapter: this.adapter,
          logger: this.logger,
          job,
          maxAttempts: this.maxAttempts,
          deleteSuccessfulJobs: this.deleteSuccessfulJobs,
          deleteFailedJobs: this.deleteFailedJobs,
        }).perform()
      } else if (this.workoff) {
        // If there are no jobs and we're in workoff mode, we're done
        break
      }

      // sleep if there were no jobs found, otherwise get back to work
      if (!job && this.forever) {
        const millsSinceLastCheck =
          new Date().getTime() - this.lastCheckTime.getTime()
        if (millsSinceLastCheck < this.sleepDelay) {
          await this.#wait(this.sleepDelay - millsSinceLastCheck)
        }
      }
    } while (this.forever)
  }

  #wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
