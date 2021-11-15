export function formatNumberToSICompact(n) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(n)
}

export function commify(n) {
  return new Intl.NumberFormat('en-US').format(n)
}
