// Days, months and years as the sales report sees them: plain calendar dates, written
// "YYYY-MM-DD", with no time zone attached.
//
// A JavaScript Date is an instant, not a calendar day, and toISOString() writes it in UTC:
// at 22:00 on the 26th in São Paulo it already says the 27th. So dates here are built and
// written from their parts, on the local calendar, and never through toISOString.

// padStart fills on the left: 9 -> "09".
const two = (number) => String(number).padStart(2, '0')

export function toIsoDate(date) {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

// "2026-09-26" -> the local midnight of that day. Months count from 0 in Date - a trap of
// the language - hence the "- 1".
export function fromIsoDate(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// "2026-09-26T14:00:00" from the API is a wall-clock time in the shop. Built from its parts
// it stays 14:00 whatever time zone the browser is in.
export function fromLocalDateTime(text) {
  const [date, time = '00:00:00'] = text.split('T')
  const [hours, minutes] = time.split(':').map(Number)
  const day = fromIsoDate(date)
  day.setHours(hours, minutes)
  return day
}

export function today() {
  return toIsoDate(new Date())
}

// One period back (-1) or forward (+1). Moving a month from the 31st lands on the last day
// of the shorter month instead of spilling into the one after.
export function shift(period, isoDate, steps) {
  const date = fromIsoDate(isoDate)

  if (period === 'Day') {
    date.setDate(date.getDate() + steps)
  } else if (period === 'Month') {
    date.setDate(1)
    date.setMonth(date.getMonth() + steps)
  } else {
    date.setFullYear(date.getFullYear() + steps, 0, 1)
  }

  return toIsoDate(date)
}

const dayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const dayAndMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

// The period as a title: "sábado, 26 de setembro de 2026", "setembro de 2026", "2026".
export function periodTitle(period, isoDate) {
  const date = fromIsoDate(isoDate)

  if (period === 'Day') {
    return dayLabel.format(date)
  }
  if (period === 'Month') {
    return monthLabel.format(date)
  }
  return String(date.getFullYear())
}

// A bucket on the chart's axis: "14h" for an hour, "26" for a day, "set." for a month.
export function bucketTick(period, start) {
  const date = fromLocalDateTime(start)

  if (period === 'Day') {
    return `${date.getHours()}h`
  }
  if (period === 'Month') {
    return String(date.getDate())
  }
  return shortMonth.format(date)
}

// A bucket in full, for the tooltip and the table: "14h às 15h", "26 de set.", "setembro de 2026".
export function bucketLabel(period, start) {
  const date = fromLocalDateTime(start)

  if (period === 'Day') {
    return `${date.getHours()}h às ${date.getHours() + 1}h`
  }
  if (period === 'Month') {
    return dayAndMonth.format(date)
  }
  return monthLabel.format(date)
}
