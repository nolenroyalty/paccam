import { COLORS } from "./COLORS";

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

export function easeLinear({ start, end, startTime, currentTime, duration }) {
  const diff = end - start;
  const elapsed = currentTime - startTime;
  const t = elapsed / duration;
  return start + diff * t;
}

export function easeInPow({
  start,
  end,
  startTime,
  currentTime,
  duration,
  pow,
}) {
  const diff = end - start;
  const elapsed = currentTime - startTime;
  const t = elapsed / duration;
  return start + diff * Math.pow(t, pow);
}

export function easeOutPow({
  start,
  end,
  startTime,
  currentTime,
  duration,
  pow,
}) {
  const diff = end - start;
  const elapsed = currentTime - startTime;
  const t = elapsed / duration;
  return start + diff * (1 - Math.pow(1 - t, pow));
}

export function colorForPlayer(num) {
  if (num === 0) {
    return COLORS.pacmanYellow;
  } else if (num === 1) {
    return COLORS.pacmanPink;
  } else if (num === 2) {
    return COLORS.pacmanGreen;
  } else if (num === 3) {
    return COLORS.pacmanOrange;
  } else {
    throw new Error(`Invalid player number: ${num}`);
  }
}
