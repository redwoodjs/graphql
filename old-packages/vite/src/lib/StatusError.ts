export class StatusError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
  }
}

// TODO (RSC): Do we need this? Can we just check instanceof StatusError?
export const hasStatusCode = (x: unknown): x is { statusCode: number } =>
  typeof (x as any)?.statusCode === 'number'
