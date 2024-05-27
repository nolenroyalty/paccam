export function range(start, end = null) {
  if (end === null) {
    return Array.from({ length: start }, (_, i) => i);
  }
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function truncateObjectDecimals(obj, places = 4) {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value.toFixed(places),
    }),
    {}
  );
}
