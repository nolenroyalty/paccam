export function range(start, end = null) {
  if (end === null) {
    return Array.from({ length: start }, (_, i) => i);
  }
  return Array.from({ length: end - start }, (_, i) => start + i);
}
