const textDecoder = new TextDecoder()

export function encodeText(input: string) {
  return new TextEncoder().encode(input)
}

export function decodeText(input: Uint8Array | undefined) {
  return textDecoder.decode(input, { stream: true })
}
