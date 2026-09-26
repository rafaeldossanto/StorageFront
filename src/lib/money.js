// Money is whole cents end to end, the same rule as the API and the database.
//
// JavaScript has a single number type, a 64-bit floating point double (like `double` in
// Java or C#). It holds whole numbers exactly up to 2^53, so 899 is exact - but 8.99 is
// not. That is why amounts are never multiplied or divided as fractions here, only
// formatted at the very end.

// Intl is built into the browser: formatting rules for every locale, no library needed.
// Created once at module load and reused, since building a formatter is not free.
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Same digits without the currency symbol - what goes inside a price field that already
// shows "R$" beside it.
const amount = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 899 -> "8,99", 123456 -> "1.234,56"
export function formatAmount(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Expected a whole number of cents, got ${cents}.`)
  }

  return amount.format(cents / 100)
}

// 899 -> "R$ 8,99"
export function formatCents(cents) {
  // There are no types to stop a caller passing 8.99 or "899", so the check happens at
  // run time. Number.isSafeInteger is false for fractions, strings, NaN and Infinity.
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Expected a whole number of cents, got ${cents}.`)
  }

  return brl.format(cents / 100)
}

// Reads what a person typed as a price into whole cents, or null when it is not a price.
//
// Works on the digits as text, never through parseFloat: in floating point 1.15 * 100 is
// 114.99999999999999, and rounding that away is exactly the bug this module exists to
// avoid.
//
// Accepts the Brazilian form ("1.234,56", "8,99", "8") and a dot as the decimal separator
// when nothing else is possible ("8.99"), because a keypad may send it.
export function parseCents(input) {
  // A regular expression literal between slashes; /g replaces every match, not just the
  // first. \s is any whitespace.
  const text = String(input).replace(/R\$|\s/g, '')

  if (text === '' || !/^\d[\d.,]*$/.test(text)) {
    return null
  }

  let whole
  let fraction

  if (text.includes(',')) {
    // Brazilian: dots group thousands, the one comma separates the cents.
    const parts = text.split(',')
    if (parts.length !== 2 || !isGroupedInteger(parts[0])) {
      return null
    }
    whole = parts[0].replaceAll('.', '')
    fraction = parts[1]
  } else {
    // No comma: a dot followed by one or two digits at the end is a decimal point; any
    // other dot groups thousands ("1.234").
    const decimal = /^(\d+)\.(\d{1,2})$/.exec(text)
    if (decimal) {
      // exec returns an array: [0] is the whole match, [1] and [2] the groups in ( ).
      whole = decimal[1]
      fraction = decimal[2]
    } else if (isGroupedInteger(text)) {
      whole = text.replaceAll('.', '')
      fraction = ''
    } else {
      return null
    }
  }

  if (!/^\d{0,2}$/.test(fraction)) {
    return null
  }

  // "5" becomes "50" and "" becomes "00": the cents, still as text, then as a number.
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

// "1234" or "1.234.567" - digits, optionally grouped by dots every three.
function isGroupedInteger(text) {
  return /^\d{1,3}(\.\d{3})*$/.test(text) || /^\d+$/.test(text)
}
