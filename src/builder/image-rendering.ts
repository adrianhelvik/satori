export function resolveSvgImageRendering(
  imageRendering: string | undefined
): string | undefined {
  if (!imageRendering) return undefined

  const normalized = imageRendering.trim().toLowerCase()
  if (!normalized) return undefined

  // CSS values like `pixelated` are not consistently honored by SVG renderers
  // such as resvg. Map to SVG-compatible values for consistent output.
  if (
    normalized === 'pixelated' ||
    normalized === 'crisp-edges' ||
    normalized === '-webkit-optimize-contrast'
  ) {
    return 'optimizeSpeed'
  }
  if (normalized === 'smooth' || normalized === 'high-quality') {
    return 'optimizeQuality'
  }
  if (normalized === 'auto') {
    return 'auto'
  }

  return imageRendering
}
