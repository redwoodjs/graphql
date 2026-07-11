// Defines the basic shape of a logger that RedwoodJob will invoke to print
// debug messages. RedwoodJob will fallback to use `console` if no
// logger is passed in to RedwoodJob or any adapter. Luckily both Redwood's

import type { IntRange } from 'type-fest'

import type { BaseAdapter } from './adapters/BaseAdapter/BaseAdapter.js'

/** Redwood's logger and the standard console logger conform to this shape. */
export interface BasicLogger {
  debug: (message?: any, ...optionalParams: any[]) => void
  info: (message?: any, ...optionalParams: any[]) => void
  warn: (message?: any, ...optionalParams: any[]) => void
  error: (message?: any, ...optionalParams: any[]) => void
}

/**
 *This is the minimum interface that a "job" must conform to in order to be
 * scheduled and executed by Redwood's job engine.
 */
export interface BaseJob {
  id: string | number
  name: string
  path: string
  args: unknown[]
  attempts: number
}
export type PossibleBaseJob = BaseJob | undefined

export type Adapters = Record<string, BaseAdapter>

export type QueueNames = readonly [string, ...string[]]

export interface WorkerConfig<
  TAdapters extends Adapters,
  TQueues extends QueueNames,
> extends WorkerSharedOptions {
  /**
   * The name of the adapter to use for this worker. This must be one of the keys
   * in the `adapters` object when you created the `JobManager`.
   */
  adapter: keyof TAdapters

  /**
   * The queue or queues that this worker should work on. You can pass a single
   * queue name, an array of queue names, or the string `'*'` to work on all
   * queues.
   */
  queue: '*' | TQueues[number] | TQueues[number][]

  /**
   * The number of workers to spawn for this worker configuration.
   *
   * @default 1
   */
  count?: number

  /**
   * The logger to use for this worker. If not provided, the logger from the
   * `JobManager` will be used.
   */
  logger?: BasicLogger
}

export interface WorkerSharedOptions {
  /**
   * The maximum number of retries to attempt for a job before giving up.
   *
   * @default 24
   */
  maxAttempts?: number

  /**
   * The maximum amount of time in seconds that a job can run before another
   * worker will attempt to retry it.
   *
   * @default 14,400 (4 hours)
   */
  maxRuntime?: number

  /**
   * Whether a job that exceeds its `maxAttempts` should be deleted from the
   * queue. If `false`, the job will remain in the queue but will not be
   * processed further.
   *
   * @default false
   */
  deleteFailedJobs?: boolean

  /**
   * Whether to keep succeeded jobs in the database after they have completed
   * successfully.
   *
   * @default true
   *
   */
  deleteSuccessfulJobs?: boolean

  /**
   * The amount of time in seconds to wait between polling the queue for new
   * jobs. Some adapters may not need this if they do not poll the queue and
   * instead rely on a subscription model.
   *
   * @default 5
   */
  sleepDelay?: number
}

export interface JobManagerConfig<
  TAdapters extends Adapters,
  TQueues extends QueueNames,
  TLogger extends BasicLogger,
> {
  /**
   * An object containing all of the adapters that this job manager will use.
   * The keys should be the names of the adapters and the values should be the
   * adapter instances.
   */
  adapters: TAdapters

  /**
   * The logger to use for this job manager. If not provided, the logger will
   * default to the console.
   */
  logger: TLogger

  /**
   * An array of all of queue names that jobs can be scheduled on to. Workers can
   * be configured to work on a selection of these queues.
   *
   * This should be an array of string literals.
   * If you're using TypeScript, you can use `as const`, like in
   * `['default', 'critical', 'low'] as const` to construct an array of string
   * literals
   */
  queues: TQueues

  /**
   * An array of worker configurations that define how jobs should be processed.
   */
  workers: WorkerConfig<TAdapters, TQueues>[]
}

export interface CreateSchedulerConfig<TAdapters extends Adapters> {
  /**
   * The name of the adapter to use for this scheduler. This must be one of the keys
   * in the `adapters` object when you created the `JobManager`.
   */
  adapter: keyof TAdapters

  /**
   * The logger to use for this scheduler. If not provided, the logger from the
   * `JobManager` will be used.
   */
  logger?: BasicLogger
}

export interface JobDefinition<
  TQueues extends QueueNames,
  TArgs extends unknown[] = [],
> {
  /**
   * The name of the queue that this job should always be scheduled on. This
   * must be one of the values in the `queues` array when you created the
   * `JobManager`.
   */
  queue: TQueues[number]

  /**
   * The priority of the job in the range of 0-100. The lower the number, the
   * higher the priority. The default is 50.
   * @default 50
   */
  priority?: PriorityValue

  /**
   * The function to run when this job is executed.
   *
   * @param args The arguments that were passed when the job was scheduled.
   */
  perform: (...args: TArgs) => Promise<void> | void
}

export type JobComputedProperties = {
  /**
   * The name of the job that was defined in the job file.
   */
  name: string

  /**
   * The path to the job file that this job was defined in.
   */
  path: string
}

export type Job<
  TQueues extends QueueNames,
  TArgs extends unknown[] = [],
> = JobDefinition<TQueues, TArgs> & JobComputedProperties

export type ScheduleJobOptions =
  | {
      /**
       * The number of seconds to wait before scheduling this job. This is mutually
       * exclusive with `waitUntil`.
       */
      wait: number
      waitUntil?: never
    }
  | {
      wait?: never
      /**
       * The date and time to schedule this job for. This is mutually exclusive with
       * `wait`.
       */
      waitUntil: Date
    }

type PriorityValue = IntRange<1, 101>

// If the job has no arguments:
//  - you may pass an empty array for the arguments and then optionally pass the scheduler options
//  - you may optionally pass the scheduler options
// If the job has arguments:
//  - you must pass the arguments and then optionally pass the scheduler options
export type CreateSchedulerArgs<TJob extends Job<QueueNames>> =
  Parameters<TJob['perform']> extends []
    ? [ScheduleJobOptions?] | [[], ScheduleJobOptions?]
    : [Parameters<TJob['perform']>, ScheduleJobOptions?]
