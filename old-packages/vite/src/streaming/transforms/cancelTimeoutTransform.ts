export function createTimeoutTransform(timeoutHandle: NodeJS.Timeout) {
  return new TransformStream({
    flush() {
      clearTimeout(timeoutHandle)
    },
  })
}
