import { useCallback, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

/** Subscribe to a Yjs type and re-render with the value produced by `read`. */
export function useYValue<T>(target: Y.Text | Y.Map<unknown>, read: () => T): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      target.observeDeep(onChange)
      return () => target.unobserveDeep(onChange)
    },
    [target]
  )
  return useSyncExternalStore(subscribe, read)
}
