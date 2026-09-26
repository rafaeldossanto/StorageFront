// Two letters that stand for a name - "Energético 473ml" is "EN", "Água Mineral" is "ÁM" -
// so a grid of products can be scanned by eye before anyone reads a word.
export function monogramOf(name) {
  // Words that start with a letter: "473ml" is a size, not a word. `\p{L}` is "any
  // letter", accents included; the `u` flag turns on that Unicode syntax.
  const words = name.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word))

  if (words.length === 0) {
    return '?'
  }

  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return letters.toLocaleUpperCase('pt-BR')
}
