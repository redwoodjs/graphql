export interface NavigateOptions {
  replace?: boolean
  scroll?: boolean
}

export type Listener = (ev?: PopStateEvent, options?: NavigateOptions) => any
export type BeforeUnloadListener = (ev: BeforeUnloadEvent) => any
export type BlockerCallback = (tx: { retry: () => void }) => void
export type Blocker = { id: string; callback: BlockerCallback }

const createHistory = () => {
  const listeners: Record<string, Listener> = {}
  const blockers: Blocker[] = []
  let beforeUnloadListener: BeforeUnloadListener | null = null

  const history = {
    listen: (listener: Listener) => {
      const listenerId = 'RW_HISTORY_LISTENER_ID_' + Date.now()
      listeners[listenerId] = listener
      globalThis.addEventListener('popstate', listener)
      return listenerId
    },
    navigate: (
      to: string,
      options: NavigateOptions = {
        scroll: true,
      },
    ) => {
      const performNavigation = () => {
        const { pathname, search, hash } = new URL(
          globalThis?.location?.origin + to,
        )

        if (
          globalThis?.location?.pathname !== pathname ||
          globalThis?.location?.search !== search ||
          globalThis?.location?.hash !== hash
        ) {
          if (options?.replace) {
            globalThis.history.replaceState({}, '', to)
          } else {
            globalThis.history.pushState({}, '', to)
          }
        }

        for (const listener of Object.values(listeners)) {
          listener(undefined, options)
        }
      }

      if (blockers.length > 0) {
        processBlockers(0, performNavigation)
      } else {
        performNavigation()
      }
    },
    back: () => {
      const performBack = () => {
        globalThis.history.back()
        for (const listener of Object.values(listeners)) {
          listener()
        }
      }

      if (blockers.length > 0) {
        processBlockers(0, performBack)
      } else {
        performBack()
      }
    },
    remove: (listenerId: string) => {
      if (listeners[listenerId]) {
        const listener = listeners[listenerId]
        globalThis.removeEventListener('popstate', listener)
        delete listeners[listenerId]
      } else {
        console.warn(
          'History Listener with ID: ' + listenerId + ' does not exist.',
        )
      }
    },
    block: (id: string, callback: BlockerCallback) => {
      const existingBlockerIndex = blockers.findIndex(
        (blocker) => blocker.id === id,
      )
      if (existingBlockerIndex !== -1) {
        blockers[existingBlockerIndex] = { id, callback }
      } else {
        blockers.push({ id, callback })
        if (blockers.length === 1) {
          addBeforeUnloadListener()
        }
      }
    },
    unblock: (id: string) => {
      const index = blockers.findIndex((blocker) => blocker.id === id)
      if (index !== -1) {
        blockers.splice(index, 1)
        if (blockers.length === 0) {
          removeBeforeUnloadListener()
        }
      }
    },
  }

  const processBlockers = (index: number, navigate: () => void) => {
    if (index < blockers.length) {
      blockers[index].callback({
        retry: () => processBlockers(index + 1, navigate),
      })
    } else {
      navigate()
    }
  }

  const addBeforeUnloadListener = () => {
    if (!beforeUnloadListener) {
      beforeUnloadListener = (event: BeforeUnloadEvent) => {
        if (blockers.length > 0) {
          event.preventDefault()
        }
      }
      globalThis.addEventListener('beforeunload', beforeUnloadListener)
    }
  }

  const removeBeforeUnloadListener = () => {
    if (beforeUnloadListener) {
      globalThis.removeEventListener('beforeunload', beforeUnloadListener)
      beforeUnloadListener = null
    }
  }

  return history
}

const gHistory = createHistory()

const { navigate, back, block, unblock } = gHistory

export { gHistory, navigate, back, block, unblock }
