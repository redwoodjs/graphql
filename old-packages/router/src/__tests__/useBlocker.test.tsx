import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { gHistory, navigate } from '../history.js'
import { useBlocker } from '../useBlocker.js'

describe('useBlocker', () => {
  it('should initialize with IDLE state', () => {
    const { result } = renderHook(() => useBlocker({ when: false }))
    expect(result.current.state).toBe('IDLE')
  })

  it('should change state to BLOCKED when blocker is triggered', () => {
    const { result, unmount } = renderHook(() => useBlocker({ when: true }))
    act(() => {
      navigate('/test')
    })
    expect(result.current.state).toBe('BLOCKED')
    unmount()
  })

  it('should not block when "when" is false', () => {
    const { result, unmount } = renderHook(() => useBlocker({ when: false }))
    act(() => {
      navigate('/test')
    })
    expect(result.current.state).toBe('IDLE')
    unmount()
  })

  it('should confirm navigation when confirm is called', () => {
    const { result, unmount } = renderHook(() => useBlocker({ when: true }))
    act(() => {
      navigate('/test')
    })
    expect(result.current.state).toBe('BLOCKED')
    act(() => {
      result.current.confirm()
    })
    expect(result.current.state).toBe('IDLE')
    unmount()
  })

  it('should abort navigation when abort is called', () => {
    const { result, unmount } = renderHook(() => useBlocker({ when: true }))
    act(() => {
      navigate('/test')
    })
    expect(result.current.state).toBe('BLOCKED')
    act(() => {
      result.current.abort()
    })
    expect(result.current.state).toBe('IDLE')
    unmount()
  })

  it('should not call listener when navigation is aborted', () => {
    const listener = vi.fn()
    const listenerId = gHistory.listen(listener)

    const { result, unmount } = renderHook(() => useBlocker({ when: true }))

    act(() => {
      navigate('/test-abort')
    })
    expect(result.current.state).toBe('BLOCKED')

    act(() => {
      result.current.abort()
    })

    expect(listener).not.toHaveBeenCalled()
    expect(result.current.state).toBe('IDLE')

    gHistory.remove(listenerId)
    unmount()
  })

  it('should call listener when navigation is confirmed', () => {
    const listener = vi.fn()
    const listenerId = gHistory.listen(listener)

    const { result, unmount } = renderHook(() => useBlocker({ when: true }))

    act(() => {
      navigate('/test-confirm')
    })
    expect(result.current.state).toBe('BLOCKED')

    act(() => {
      result.current.confirm()
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe('IDLE')

    gHistory.remove(listenerId)
    unmount()
  })
})
