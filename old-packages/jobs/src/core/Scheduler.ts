import type {
  BaseAdapter,
  SchedulePayload,
} from '../adapters/BaseAdapter/BaseAdapter.js'
import {
  DEFAULT_LOGGER,
  DEFAULT_PRIORITY,
  DEFAULT_WAIT,
  DEFAULT_WAIT_UNTIL,
} from '../consts.js'
import {
  AdapterNotConfiguredError,
  QueueNotDefinedError,
  SchedulingError,
} from '../errors.js'
import type {
  BasicLogger,
  Job,
  QueueNames,
  ScheduleJobOptions,
} from '../types.js'

interface SchedulerConfig<TAdapter extends BaseAdapter> {
  adapter: TAdapter
  logger?: BasicLogger
}

export class Scheduler<TAdapter extends BaseAdapter> {
  adapter: TAdapter
  logger: NonNullable<SchedulerConfig<TAdapter>['logger']>

  constructor({ adapter, logger }: SchedulerConfig<TAdapter>) {
    this.logger = logger ?? DEFAULT_LOGGER
    this.adapter = adapter

    if (!this.adapter) {
      throw new AdapterNotConfiguredError()
    }
  }

  computeRunAt({ wait, waitUntil }: { wait: number; waitUntil: Date | null }) {
    if (wait && wait > 0) {
      return new Date(Date.now() + wait * 1000)
    } else if (waitUntil) {
      return waitUntil
    } else {
      return new Date()
    }
  }

  buildPayload<TJob extends Job<QueueNames, unknown[]>>({
    job,
    args,
    options,
  }: {
    job: TJob
    args: Parameters<TJob['perform']> | never[]
    options?: ScheduleJobOptions
  }): SchedulePayload {
    const queue = job.queue
    const priority = job.priority ?? DEFAULT_PRIORITY
    const wait = options?.wait ?? DEFAULT_WAIT
    const waitUntil = options?.waitUntil ?? DEFAULT_WAIT_UNTIL

    if (!queue) {
      throw new QueueNotDefinedError()
    }

    return {
      name: job.name,
      path: job.path,
      args: args ?? [],
      runAt: this.computeRunAt({ wait, waitUntil }),
      queue: queue,
      priority: priority,
    }
  }

  async schedule<TJob extends Job<QueueNames, unknown[]>>({
    job,
    args,
    options,
  }: {
    job: TJob
    args: Parameters<TJob['perform']> | never[]
    options?: ScheduleJobOptions
  }) {
    const payload = this.buildPayload({
      job,
      args,
      options,
    })

    this.logger.info(payload, `[RedwoodJob] Scheduling ${job.name}`)

    try {
      await this.adapter.schedule(payload)
      return true
    } catch (e) {
      throw new SchedulingError(
        `[RedwoodJob] Exception when scheduling ${payload.name}`,
        e as Error,
      )
    }
  }
}
