import { useEffect } from 'react'

/**
 *
 * Use this hook to run a function when the document is ready.
 *
 * Useful to run things on ~first~ hard render only. Note that this will not fire on soft renders
 *
 * @param callback Any function you want to run, when document is ready
 * @returns
 */
export const useDocumentReady = (callback: () => void) => {
  return useEffect(() => {
    const handler = (_e: Event) => {
      // This event fires for "interactive" and "complete"
      if (document.readyState === 'complete') {
        callback()
      }
    }

    document.addEventListener('readystatechange', handler)

    return () => {
      document.removeEventListener('readystatechange', handler)
    }
  }, [callback])
}
