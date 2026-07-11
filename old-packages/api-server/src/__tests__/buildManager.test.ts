import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { BuildManager } from '../buildManager'
import type { BuildAndRestartOptions } from '../buildManager'

const buildApi = vi.fn()
const cleanApiBuild = vi.fn()
const rebuildApi = vi.fn()

async function build(options: BuildAndRestartOptions) {
  if (options.clean) {
    await cleanApiBuild()
  }

  if (options.rebuild) {
    await rebuildApi()
  } else {
    await buildApi()
  }
}

describe('BuildManager', () => {
  let buildManager: BuildManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    buildManager = new BuildManager(build)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should handle rebuild: false correctly', async () => {
    buildManager.run({ rebuild: false })

    await vi.runAllTimersAsync()

    expect(rebuildApi).not.toHaveBeenCalled()
    expect(buildApi).toHaveBeenCalled()
  })

  it('should handle clean: true correctly', async () => {
    buildManager.run({ rebuild: true, clean: true })

    await vi.runAllTimersAsync()

    expect(cleanApiBuild).toHaveBeenCalled()
    expect(rebuildApi).toHaveBeenCalled()
  })

  it('should prioritize rebuild:false', async () => {
    buildManager.run({ rebuild: true, clean: true })
    buildManager.run({ rebuild: false, clean: false })

    await vi.runAllTimersAsync()

    expect(cleanApiBuild).toHaveBeenCalled()
    expect(rebuildApi).not.toHaveBeenCalled()
    expect(buildApi).toHaveBeenCalled()
  })

  it('should prioritize clean: true', async () => {
    buildManager.run({ rebuild: true, clean: true })
    buildManager.run({ rebuild: false, clean: false })

    await vi.runAllTimersAsync()

    expect(cleanApiBuild).toHaveBeenCalled()
    expect(rebuildApi).not.toHaveBeenCalled()
    expect(buildApi).toHaveBeenCalled()
  })

  it('should reset flags after execution', async () => {
    buildManager.run({ rebuild: true, clean: true })

    await vi.runAllTimersAsync()

    expect(buildApi).not.toHaveBeenCalled()
    expect(rebuildApi).toHaveBeenCalled()
    expect(cleanApiBuild).toHaveBeenCalled()

    buildManager.run({ rebuild: false, clean: false })

    await vi.runAllTimersAsync()

    expect(buildApi).toHaveBeenCalled()
  })

  it('should debounce multiple calls', async () => {
    buildManager.run({ rebuild: true, clean: true })
    buildManager.run({ rebuild: true, clean: false })
    buildManager.run({ rebuild: true, clean: true })

    await vi.runAllTimersAsync()

    expect(buildApi).not.toHaveBeenCalledOnce()
    expect(rebuildApi).toHaveBeenCalledOnce()
    expect(cleanApiBuild).toHaveBeenCalledOnce()
  })
})
