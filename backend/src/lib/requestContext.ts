import { AsyncLocalStorage } from 'async_hooks'

interface RequestContextValue {
  requestId?: string
}

const storage = new AsyncLocalStorage<RequestContextValue>()

export function runWithContext<T>(ctx: RequestContextValue, fn: () => T): T {
  return storage.run(ctx, fn)
}

export function setContext(ctx: RequestContextValue): void {
  const current = storage.getStore() || {}
  storage.enterWith({ ...current, ...ctx })
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId
}
