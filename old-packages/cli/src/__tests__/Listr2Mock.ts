import type Enquirer from 'enquirer'
import type * as Listr from 'listr2'
import type { vi } from 'vitest'

type Ctx = Record<string, any>
type TRenderer = typeof Listr.ListrRenderer

type EnquirerPromptOptions = Parameters<Enquirer['prompt']>[0]
type Function = { length: number; name: string }
type PlainPromptOptions = ReturnType<Extract<EnquirerPromptOptions, Function>>
type ListrPromptOptions = Parameters<
  Listr.ListrTaskWrapper<Ctx, TRenderer, TRenderer>['prompt']
>[0]

function isSupportedOptionsType(
  options: unknown,
): options is PlainPromptOptions | PlainPromptOptions[] {
  const optionsArray = Array.isArray(options) ? options : [options]

  return optionsArray.every(
    (option) =>
      typeof option !== 'function' &&
      // message is the only required property in `BasePromptOptions` in Listr2
      'message' in option,
  )
}

class Listr2TaskWrapper {
  task: Listr.ListrTask<Ctx, TRenderer>
  promptOutput: string

  // This is part of Listr.TaskWrapper, but we don't need it
  // private options: Record<PropertyKey, any> | undefined
  listrOptions?: Listr.ListrOptions | undefined

  constructor({
    task,
    options,
  }: {
    task: Listr.ListrTask<Ctx, TRenderer>
    options?: Record<PropertyKey, any> | undefined
  }) {
    this.task = task
    this.listrOptions = options
    this.promptOutput = ''
  }

  report() {}
  cancelPrompt() {}
  readonly output = ''

  stdout() {
    return process.stdout
  }

  get title(): string | any[] | undefined {
    return this.task.title
  }
  set title(title: string) {
    this.task.title = title
  }

  newListr(
    tasks: Listr.ListrTask<Ctx, typeof Listr.ListrRenderer>[],
    options?: Listr.ListrOptions,
  ) {
    return new Listr2Mock(tasks, options)
  }

  isRetrying() {
    return false
  }

  run(ctx: Ctx, task: Listr2TaskWrapper) {
    return this.task.task(
      ctx,
      // TODO: fix this by removing the type casts.
      // The reason we have to do this is because of private fields in
      // Listr.ListrTaskWrapper (this was at least the case for Listr2 v6)
      task as unknown as Listr.ListrTaskWrapper<
        Ctx,
        typeof Listr.ListrRenderer,
        typeof Listr.ListrRenderer
      >,
    )
  }

  public prompt(..._args: any[]) {
    const ctxEnquirer = this.listrOptions?.ctx?.enquirer

    const run = async <T extends object = any>(options: ListrPromptOptions) => {
      const enquirer = Listr2Mock.mockPrompt
        ? { prompt: Listr2Mock.mockPrompt }
        : ctxEnquirer

      if (!enquirer) {
        throw new Error('Enquirer instance not available')
      }

      if (!isSupportedOptionsType(options)) {
        console.error('Unsupported prompt options', options)
        throw new Error('Unsupported prompt options type')
      }

      const enquirerOptions = !Array.isArray(options)
        ? [{ ...options, name: 'default' }]
        : options

      if (enquirerOptions.length === 1) {
        enquirerOptions[0].name = 'default'
      }

      const response = await enquirer.prompt(enquirerOptions)

      if (enquirerOptions.length === 1) {
        if (typeof response !== 'object') {
          throw new Error(
            'Expected an object response from prompt().\n' +
              'Make sure you\'re returning `{ default: "value" }` if you\'re ' +
              'mocking the prompt return value',
          )
        }

        if ('default' in response) {
          // The type cast here isn't great. But Listr2 itself also type cast
          // the response (but they cast it to `any`)
          // https://github.com/listr2/listr2/blob/b4f544ebce9582f56b2b42fdbe834d70678ce966/packages/prompt-adapter-enquirer/src/prompt.ts#L74
          return response.default as T
        }
      }

      return response
    }

    return {
      run,
    }
  }

  skip(msg: string) {
    const taskTitle = typeof this.task.title === 'string' ? this.task.title : ''
    Listr2Mock.skippedTaskTitles.push(msg || taskTitle)
  }
}

export class Listr2Mock {
  static executedTaskTitles: string[]
  static skippedTaskTitles: string[]
  static mockPrompt:
    | Parameters<
        typeof vi.fn<
          (args: EnquirerPromptOptions) => Promise<object | object[]>
        >
      >[0]
    | undefined

  ctx: Ctx
  tasks: Listr2TaskWrapper[]

  constructor(
    tasks: Listr.ListrTask<Ctx, typeof Listr.ListrRenderer>[],
    options?: Listr.ListrOptions,
  ) {
    this.ctx = options?.ctx || {}
    this.tasks = tasks.map((task) => new Listr2TaskWrapper({ task, options }))
  }

  async run(
    executedTaskTitles: string[] = [],
    skippedTaskTitles: string[] = [],
  ) {
    Listr2Mock.executedTaskTitles = executedTaskTitles
    Listr2Mock.skippedTaskTitles = skippedTaskTitles

    for (const task of this.tasks) {
      const skip =
        typeof task.task.skip === 'function'
          ? task.task.skip
          : () => task.task.skip

      const skipReturnValue = skip(this.ctx)

      if (typeof skipReturnValue === 'string') {
        // skip() => 'message'
        Listr2Mock.skippedTaskTitles.push(skipReturnValue)
        continue
      } else if (skipReturnValue) {
        // skip() => true
        const taskTitle = typeof task.title === 'string' ? task.title : ''
        Listr2Mock.skippedTaskTitles.push(taskTitle)
        continue
      }

      const runReturnValue = await task.run(this.ctx, task)

      if (runReturnValue instanceof Listr2Mock) {
        await runReturnValue.run(
          Listr2Mock.executedTaskTitles,
          Listr2Mock.skippedTaskTitles,
        )
      }

      // storing the title after running the task in case the task
      // modifies its own title
      if (typeof task.title === 'string') {
        Listr2Mock.executedTaskTitles.push(task.title)
      }
    }
  }
}
