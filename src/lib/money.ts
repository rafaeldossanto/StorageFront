// Money is whole cents end to end, the same rule as the API and the database. The
// browser's number is a double, which cannot hold 8.99 exactly but holds 899 exactly, so
// amounts are never multiplied or divided as fractions here - only formatted.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 899 -> "R$ 8,99" */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Expected a whole number of cents, got ${cents}.`)
  }

  return brl.format(cents / 100)
}

/**
 * Reads what a person typed as a price into whole cents, or null when it is not a price.
 *
 * Works on the digits as text, never through parseFloat: "8.99" * 100 is 898.9999999 in
 * floating point, and rounding that away is exactly the bug this module exists to avoid.
 *
 * Accepts the Brazilian form ("1.234,56", "8,99", "8") and a dot as the decimal separator
 * when nothing else is possible ("8.99"), because a barcode scanner or a keypad may send it.
 */
export function parseCents(input: string): number | null {
  const text = input.replace(/R\$|\s/g, '')

  if (text === '' || !/^\d[\d.,]*$/.test(text)) {
    return null
  }

  let whole: string
  let fraction: string

  if (text.includes(',')) {
    // Brazilian: dots group thousands, the one comma separates the cents.
    const parts = text.split(',')
    if (parts.length !== 2 || !/^\d{1,3}(\.\d{3})*$|^\d+$/.test(parts[0])) {
      return null
    }
    whole = parts[0].replaceAll('.', '')
    fraction = parts[1]
  } else {
    // No comma: a dot followed by one or two digits at the end is a decimal point;
    // any other dot groups thousands ("1.234").
    const decimal = /^(\d+)\.(\d{1,2})$/.exec(text)
    if (decimal) {
      whole = decimal[1]
      fraction = decimal[2]
    } else if (/^\d{1,3}(\.\d{3})*$|^\d+$/.test(text)) {
      whole = text.replaceAll('.', '')
      fraction = ''
    } else {
      return null
    }
  }

  if (!/^\d{0,2}$/.test(fraction)) {
    return null
  }

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}
