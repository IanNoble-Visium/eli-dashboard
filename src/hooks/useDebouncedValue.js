import { useEffect, useState } from 'react'

export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), Math.max(0, delay))
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

