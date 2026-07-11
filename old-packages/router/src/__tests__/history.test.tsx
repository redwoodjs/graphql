import { describe, it, expect, vi, afterEach } from 'vitest'

import { gHistory, navigate, back, block, unblock } from '../history.js'

describe('navigate', () => {
  describe('does not increase history length', () => {
    it('handles direct matches for pathname, search, and hash', () => {
      expect(globalThis.history.length).toEqual(1)
      navigate('/test-1?search=testing#test')
      expect(globalThis.history.length).toEqual(2)
      navigate('/test-1?search=testing#test')
      expect(globalThis.history.length).toEqual(2)
    })
  })

  describe('increasing history length', () => {
    it('handles pathname', () => {
      expect(globalThis.history.length).toEqual(2)
      navigate('/test-2')
      expect(globalThis.history.length).toEqual(3)
      navigate('/test-3')
      expect(globalThis.history.length).toEqual(4)
    })

    it('handles search', () => {
      expect(globalThis.history.length).toEqual(4)
      navigate('/test-3')
      expect(globalThis.history.length).toEqual(4)
      navigate('/test-3?search=testing')
      expect(globalThis.history.length).toEqual(5)
      navigate('/test-3?search=testing')
      expect(globalThis.history.length).toEqual(5)
    })

    it('handles hash', () => {
      expect(globalThis.history.length).toEqual(5)
      navigate('/test-3')
      expect(globalThis.history.length).toEqual(6)
      navigate('/test-3#testing')
      expect(globalThis.history.length).toEqual(7)
      navigate('/test-3#testing')
      expect(globalThis.history.length).toEqual(7)
    })
  })
})

describe('back', () => {
  describe('back', () => {
    it('goes back in history', () => {
      const spy = vi.spyOn(globalThis.history, 'back')
      back()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('listener', () => {
  describe('navigate', () => {
    it('calls listeners after navigating', () => {
      const listener = vi.fn()
      const listenerId = gHistory.listen(listener)
      navigate('/test')
      expect(listener).toHaveBeenCalledTimes(1)
      gHistory.remove(listenerId)
    })
  })
  describe('back', () => {
    it('calls listeners after going back', () => {
      const listener = vi.fn()
      const listenerId = gHistory.listen(listener)
      navigate('/test')
      expect(listener).toHaveBeenCalledTimes(1)
      back()
      expect(listener).toHaveBeenCalledTimes(2)
      gHistory.remove(listenerId)
    })
  })
})

describe('blocking', () => {
  describe('block', () => {
    it('calls a blocker', () => {
      const blocker = { id: 'test-blocker-1', callback: vi.fn() }
      block(blocker.id, blocker.callback)
      navigate('/test')
      expect(blocker.callback).toHaveBeenCalledTimes(1)
      unblock(blocker.id)
    })
  })

  describe('unblock', () => {
    it('removes a blocker', () => {
      const blocker = { id: 'test-blocker-1', callback: vi.fn() }
      block(blocker.id, blocker.callback)
      unblock(blocker.id)
      navigate('/test')
      expect(blocker.callback).not.toHaveBeenCalled()
    })

    it('blocks navigation', () => {
      const listener = vi.fn()
      const listenerId = gHistory.listen(listener)
      const blocker = { id: 'test-blocker-1', callback: vi.fn() }
      block(blocker.id, blocker.callback)
      navigate('/test')
      expect(listener).not.toHaveBeenCalled()
      expect(blocker.callback).toHaveBeenCalledTimes(1)
      gHistory.remove(listenerId)
      unblock(blocker.id)
    })

    it('allows navigation after unblocking', () => {
      const listener = vi.fn()
      const listenerId = gHistory.listen(listener)
      const blocker = { id: 'test-blocker-1', callback: vi.fn() }
      block(blocker.id, blocker.callback)
      unblock(blocker.id)
      navigate('/test')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(blocker.callback).not.toHaveBeenCalled()
      gHistory.remove(listenerId)
    })
  })

  describe('beforeUnload', () => {
    const blocker1 = { id: 'test-blocker-1', callback: vi.fn() }
    const blocker2 = { id: 'test-blocker-2', callback: vi.fn() }

    afterEach(() => {
      unblock(blocker1.id)
      unblock(blocker2.id)
    })

    it('adds beforeUnload listener only on the first blocker', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      block(blocker1.id, blocker1.callback)
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      )
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1)

      block(blocker2.id, blocker2.callback)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
    })

    it('does not remove beforeUnload listener when unblocking non-last blocker', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      block(blocker1.id, blocker1.callback)
      block(blocker2.id, blocker2.callback)

      unblock(blocker1.id)
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      )
    })

    it('removes beforeUnload listener when unblocking the last blocker', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      block(blocker1.id, blocker1.callback)
      block(blocker2.id, blocker2.callback)

      unblock(blocker1.id)
      unblock(blocker2.id)
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      )
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('navigate options', () => {
  describe('replace', () => {
    it('should let us navigate without adding to history length', () => {
      const initialHistoryLength = globalThis.history.length

      navigate('/test-1')
      expect(globalThis.history.length).toEqual(initialHistoryLength + 1)
      navigate('/test-2')
      expect(globalThis.history.length).toEqual(initialHistoryLength + 2)
      navigate('/test-3', { replace: true })
      expect(globalThis.history.length).toEqual(initialHistoryLength + 2)
      navigate('/test-4', { replace: true })
      expect(globalThis.history.length).toEqual(initialHistoryLength + 2)
    })
  })
})
