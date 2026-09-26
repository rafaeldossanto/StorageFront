import { useCallback, useEffect, useState } from 'react'
import { listProducts, searchProducts } from '@/api/catalog'

const PAGE_SIZE = 24

// The products on screen: a name search when there is one, otherwise a category's
// branch. Pages are appended as the person asks for more.
//
// Also takes changes made elsewhere on the screen - a product just registered or edited -
// so the grid reflects them without asking the API again.
export function useProductList({ categoryId, search }) {
  // Names the listing being shown. The state remembers which listing it holds, so a new
  // search or category shows as "loading" at once, without an effect having to say so.
  const listing = search ? `search:${search}` : `category:${categoryId}`

  const [state, setState] = useState({ listing: null })

  // useCallback returns the same function between renders until one of the listed values
  // changes. The effect below depends on it, so a new search or category - and only
  // that - starts a new listing.
  const fetchPage = useCallback(
    (page, signal) => {
      if (search) {
        return searchProducts({ search, page, pageSize: PAGE_SIZE }, { signal })
      }
      if (categoryId) {
        return listProducts({ categoryId, page, pageSize: PAGE_SIZE }, { signal })
      }
      return Promise.resolve({ items: [], page: 1, totalPages: 0, total: 0 })
    },
    [categoryId, search],
  )

  useEffect(() => {
    // Cancels the request if the listing changes before it answers, so a slow old answer
    // never overwrites a newer one.
    const controller = new AbortController()

    fetchPage(1, controller.signal)
      .then((result) => setState({ ...result, listing, status: 'ready', error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ items: [], page: 0, totalPages: 0, total: 0, listing, status: 'error', error })
        }
      })

    return () => controller.abort()
  }, [fetchPage, listing])

  const loadMore = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading-more' }))

    try {
      const next = await fetchPage(state.page + 1)
      setState((current) => ({
        ...next,
        // Spread into a new array: React compares state by reference, so changing the old
        // array in place would not redraw anything.
        items: [...current.items, ...next.items],
        listing: current.listing,
        status: 'ready',
        error: null,
      }))
    } catch (error) {
      setState((current) => ({ ...current, status: 'ready', error }))
    }
  }, [fetchPage, state.page])

  // A product created or edited on this screen. It is swapped in where it already shows;
  // a new one joins the top of the list when it belongs here.
  const upsert = useCallback((product, { belongs }) => {
    setState((current) => {
      if (current.items == null) {
        return current
      }

      const index = current.items.findIndex((item) => item.id === product.id)

      if (index >= 0) {
        // `with` returns a copy of the array with one position replaced.
        return { ...current, items: current.items.with(index, product) }
      }

      return belongs
        ? { ...current, items: [product, ...current.items], total: current.total + 1 }
        : current
    })
  }, [])

  const remove = useCallback((id) => {
    setState((current) => {
      if (current.items == null || !current.items.some((item) => item.id === id)) {
        return current
      }

      return { ...current, items: current.items.filter((item) => item.id !== id), total: current.total - 1 }
    })
  }, [])

  // What this render shows: the stored result when it is for the listing asked for,
  // otherwise an empty "loading" until the effect's answer arrives.
  const shown =
    state.listing === listing
      ? state
      : { items: [], page: 0, totalPages: 0, total: 0, status: 'loading', error: null }

  return {
    items: shown.items,
    total: shown.total,
    status: shown.status,
    error: shown.error,
    hasMore: shown.page < shown.totalPages,
    loadMore,
    upsert,
    remove,
  }
}
