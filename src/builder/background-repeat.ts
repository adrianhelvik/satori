export type RepeatMode = 'repeat' | 'no-repeat' | 'round' | 'space'

function normalizeRepeatMode(value: string): RepeatMode {
  if (
    value === 'repeat' ||
    value === 'no-repeat' ||
    value === 'round' ||
    value === 'space'
  ) {
    return value
  }
  return 'repeat'
}

export function parseRepeatModes(repeat: string): {
  x: RepeatMode
  y: RepeatMode
} {
  const normalized = String(repeat || 'repeat')
    .trim()
    .toLowerCase()

  if (normalized === 'repeat-x') return { x: 'repeat', y: 'no-repeat' }
  if (normalized === 'repeat-y') return { x: 'no-repeat', y: 'repeat' }

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (!parts.length) return { x: 'repeat', y: 'repeat' }
  if (parts.length === 1) {
    const mode = normalizeRepeatMode(parts[0])
    return { x: mode, y: mode }
  }
  return {
    x: normalizeRepeatMode(parts[0]),
    y: normalizeRepeatMode(parts[1]),
  }
}

export function resolveBackgroundAxisTiling({
  mode,
  areaSize,
  tileSize,
  offset,
  origin,
}: {
  mode: RepeatMode
  areaSize: number
  tileSize: number
  offset: number
  origin: number
}): {
  patternSize: number | string
  patternOffset: number
  imageSize: number
  imageOffset: number
} {
  if (mode === 'no-repeat' || !isFinite(tileSize) || tileSize <= 0) {
    return {
      patternSize: '100%',
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (mode === 'repeat') {
    return {
      patternSize: tileSize,
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (!isFinite(areaSize) || areaSize <= 0) {
    return {
      patternSize: tileSize,
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (mode === 'round') {
    const count = Math.max(1, Math.round(areaSize / tileSize))
    const roundedSize = areaSize / count
    return {
      patternSize: roundedSize,
      patternOffset: origin,
      imageSize: roundedSize,
      imageOffset: 0,
    }
  }

  // `space`: distribute full gaps between tiles. If fewer than two tiles fit,
  // browsers effectively fall back to single-image placement.
  const count = Math.floor(areaSize / tileSize)
  if (count <= 1) {
    return {
      patternSize: '100%',
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  const gap = (areaSize - count * tileSize) / (count - 1)
  return {
    patternSize: tileSize + gap,
    patternOffset: origin,
    imageSize: tileSize,
    imageOffset: 0,
  }
}
