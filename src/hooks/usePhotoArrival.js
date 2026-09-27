import { useCallback, useEffect, useRef } from 'react'
import { awaitPhoto } from '@/api/catalog'

// Watches products registered on this screen until their photo arrives, and hands each one
// back to `onArrive(product)` - with the photo - so the screen can swap the monogram for it.
//
// Returns `watch(product)`. Leaving the screen stops every watch still running.
export function usePhotoArrival(onArrive) {
  const latest = useRef(onArrive)
  const running = useRef(new Set())

  useEffect(() => {
    latest.current = onArrive
  })

  useEffect(() => {
    // Copied into the effect: the cleanup runs later, and must stop the watches this
    // mount started.
    const watches = running.current
    return () => {
      for (const controller of watches) {
        controller.abort()
      }
    }
  }, [])

  return useCallback((product) => {
    if (product.photo) {
      return
    }

    const controller = new AbortController()
    running.current.add(controller)

    awaitPhoto(product, { signal: controller.signal })
      .then((fresh) => {
        if (fresh) {
          latest.current(fresh)
        }
      })
      // A lookup that fails only leaves the monogram in place: nothing to tell anyone.
      .catch(() => {})
      .finally(() => running.current.delete(controller))
  }, [])
}
