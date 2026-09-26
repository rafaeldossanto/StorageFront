// @vitest-environment jsdom

import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useScanner } from './useScanner'

function Field({ onScan }) {
  const [value, setValue] = useState('8,9')
  useScanner(onScan)
  return <input aria-label="custo" value={value} onChange={(event) => setValue(event.target.value)} />
}

// What a real browser does with a key nobody prevented: it types it into the field. jsdom
// does not type on its own, so the test does it for the keys the hook let through.
function typeInto(field, key) {
  const prototype = HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, field.value + key)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

// Keys `gapMs` apart, each typed into the field unless prevented. timeStamp is read-only
// on a real event, so it is set with defineProperty. Returns, per key, whether it was
// prevented.
function press(field, keys, gapMs) {
  const prevented = []

  act(() => {
    for (const [index, key] of keys.entries()) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      Object.defineProperty(event, 'timeStamp', { value: 1000 + index * gapMs })
      field.dispatchEvent(event)
      prevented.push(event.defaultPrevented)

      if (key !== 'Enter' && !event.defaultPrevented) {
        typeInto(field, key)
      }
    }
  })

  return prevented
}

function renderField(onScan) {
  render(<Field onScan={onScan} />)
  return screen.getByRole('textbox', { name: 'custo' })
}

afterEach(() => {
  cleanup()
})

describe('useScanner', () => {
  it('puts the field with the cursor back as it was when a code is scanned into it', () => {
    const onScan = vi.fn()
    const field = renderField(onScan)

    const prevented = press(field, [...'7891000000014', 'Enter'], 2)

    expect(onScan).toHaveBeenCalledWith('7891000000014')
    expect(field).toHaveValue('8,9')
    // Only the reader's Enter is taken; it must not also submit the field.
    expect(prevented).toEqual([...Array(13).fill(false), true])
  })

  it('never loses keys that come fast but are not a scan', () => {
    const onScan = vi.fn()
    const field = renderField(onScan)

    // Two keys pressed almost together, with no Enter after: a person, not a reader.
    const prevented = press(field, ['3', '1'], 5)

    expect(prevented).toEqual([false, false])
    expect(field).toHaveValue('8,931')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('lets a person type normally', () => {
    const onScan = vi.fn()
    const field = renderField(onScan)

    const prevented = press(field, ['1', '2', 'Enter'], 100)

    expect(prevented).toEqual([false, false, false])
    expect(field).toHaveValue('8,912')
    expect(onScan).not.toHaveBeenCalled()
  })
})
