import { useCallback, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  error: Error | null
  loading: boolean
}

export function useAsync<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  })

  const run = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, error: null, loading: true })
      try {
        const result = await fn(...args)
        setState({ data: result, error: null, loading: false })
        return result
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        setState({ data: null, error, loading: false })
        return null
      }
    },
    [fn],
  )

  return { ...state, run }
}
