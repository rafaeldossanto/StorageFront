// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProductThumb } from './ProductThumb'

const coke = {
  id: 'coke',
  name: 'Coca-Cola Lata 350ml',
  photo: {
    url: '/api/product-photos/07894900010015?v=ab12',
    source: 'Open Food Facts',
    sourcePage: 'https://world.openfoodfacts.org/product/7894900010015',
    license: 'CC BY-SA 3.0',
  },
}

afterEach(() => {
  cleanup()
})

describe('ProductThumb', () => {
  it('shows the photo from the API address', () => {
    const { container } = render(<ProductThumb product={coke} />)

    // alt="" makes the image decorative: the name is written beside it.
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('src', 'http://api.test/api/product-photos/07894900010015?v=ab12')
    expect(image).toHaveAttribute('alt', '')
  })

  it('shows the monogram while there is no photo', () => {
    const { container } = render(<ProductThumb product={{ ...coke, photo: null }} />)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('CL')).toBeInTheDocument()
  })

  it('falls back to the monogram when the photo does not load, and tries a new one', () => {
    const { container, rerender } = render(<ProductThumb product={coke} />)

    fireEvent.error(container.querySelector('img'))
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('CL')).toBeInTheDocument()

    rerender(<ProductThumb product={{ ...coke, photo: { ...coke.photo, url: '/api/product-photos/07894900010015?v=cd34' } }} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'http://api.test/api/product-photos/07894900010015?v=cd34')
  })
})
