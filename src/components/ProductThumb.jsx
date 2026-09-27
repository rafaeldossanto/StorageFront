import { useState } from 'react'
import { photoUrl } from '@/api/catalog'
import { Monogram } from '@/components/Monogram'
import { cn } from '@/lib/utils'

// The product's picture: its photo on white when it has one, its monogram otherwise - just
// registered, a code no database knows, or a photo that failed to load.
//
// The photo is decoration beside the name, which is always written next to it, so it has
// an empty alt: a screen reader reads the name once, not twice.
export function ProductThumb({ product, className }) {
  const src = photoUrl(product)

  // Remembers which address failed, not just that one did: a product that later gets a
  // new photo tries the new address instead of staying on the monogram.
  const [failed, setFailed] = useState(null)

  if (src === null || failed === src) {
    return <Monogram name={product.name} className={className} />
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(src)}
      className={cn('size-8 shrink-0 rounded-md bg-white object-contain', className)}
    />
  )
}
