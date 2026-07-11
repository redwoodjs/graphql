// Used by the job runner to execute a job and track success or failure

import type { BaseAdapter } from '../adapters/BaseAdapter/BaseAdapter.js'
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_DELETE_FAILED_JOBS,
  DEFAULT_DELETE_SUCCESSFUL_JOBS,
  DEFAULT_LOGGER,
} from '../consts.js'
import { AdapterRequiredError, JobRequiredError } from '../errors.js'
import { loadJob } from '../loaders.js'
import type { BaseJob, BasicLogger } from '../types.js'

export interface ExecutorOptions {
  adapter: BaseAdapter
  job: BaseJob
  logger?: BasicLogger
  maxAttempts?: number
  deleteFailedJobs?: boolean
  deleteSuccessfulJobs?: boolean
}

export const DEFAULTS = {
  logger: DEFAULT_LOGGER,
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  deleteFailedJobs: DEFAULT_DELETE_FAILED_JOBS,
  deleteSuccessfulJobs: DEFAULT_DELETE_SUCCESSFUL_JOBS,
}

export class Executor {
  options: Required<ExecutorOptions>
  adapter: ExecutorOptions['adapter']
  logger: NonNullable<ExecutorOptions['logger']>
  job: BaseJob
  maxAttempts: NonNullable<ExecutorOptions['maxAttempts']>
  deleteFailedJobs: NonNullable<ExecutorOptions['deleteFailedJobs']>
  deleteSuccessfulJobs: NonNullable<ExecutorOptions['deleteSuccessfulJobs']>

  constructor(options: ExecutorOptions) {
    this.options = { ...DEFAULTS, ...options }

    // validate that everything we need is available
    if (!this.options.adapter) {
      throw new AdapterRequiredError()
    }
    if (!this.options.job) {
      throw new JobRequiredError()
    }

    this.adapter = this.options.adapter
    this.logger = this.options.logger
    this.job = this.options.job
    this.maxAttempts = this.options.maxAttempts
    this.deleteFailedJobs = this.options.deleteFailedJobs
    this.deleteSuccessfulJobs = this.options.deleteSuccessfulJobs
  }

  get jobIdentifier() {
    return `${this.job.id} (${this.job.path}:${this.job.name})`
  }

  async perform() {
    this.logger.info(`[RedwoodJob] Started job ${this.jobIdentifier}`)

    try {
      const job = await loadJob({ name: this.job.name, path: this.job.path })
      await job.perform(...this.job.args)

      await this.adapter.success({
        job: this.job,
        deleteJob: this.deleteSuccessfulJobs,
      })
    } catch (error: any) {
      this.logger.error(
        `[RedwoodJob] Error in job ${this.jobIdentifier}: ${error.message}`,
      )
      this.logger.error(error.stack)

      await this.adapter.error({
        job: this.job,
        error,
      })

      if (this.job.attempts >= this.maxAttempts) {
        this.logger.warn(
          this.job,
          `[RedwoodJob] Failed job ${this.jobIdentifier}: reached max attempts (${this.maxAttempts})`,
        )
        await this.adapter.failure({
          job: this.job,
          deleteJob: this.deleteFailedJobs,
        })
      }
    }
  }
}
