// @TODO: we may need to switch it out for running on edge like next.js
const queueTask = setImmediate

export function createBufferedTransformStream() {
  let bufferedBytes = new Uint8Array()
  let pendingFlush: Promise<void> | null = null

  const flushBuffer = (
    controller: TransformStreamDefaultController<Uint8Array>,
  ) => {
    if (!pendingFlush) {
      pendingFlush = new Promise<void>((resolve) => {
        queueTask(() => {
          controller.enqueue(bufferedBytes)
          bufferedBytes = new Uint8Array()
          pendingFlush = null
          resolve()
        })
      })
    }
  }

  return new TransformStream({
    transform(chunk, controller) {
      const newBufferedBytes = new Uint8Array(
        bufferedBytes.length + chunk.length,
      )

      newBufferedBytes.set(bufferedBytes)
      // @NOTE: offset here is the second param
      newBufferedBytes.set(chunk, bufferedBytes.length)
      bufferedBytes = newBufferedBytes
      flushBuffer(controller)
    },

    flush() {
      if (pendingFlush) {
        return pendingFlush
      }

      return
    },
  })
}
