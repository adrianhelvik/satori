interface NonComparableCase {
  pattern: RegExp
  note: string
}

const NON_COMPARABLE_CASES: NonComparableCase[] = [
  {
    pattern:
      /test\/image\.test\.tsx :: Image > should support ArrayBuffer as src$/,
    note: 'ArrayBuffer src is a Satori-only runtime input and cannot be represented in static browser HTML.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: background-image: url\(\) > should resolve data uris with size for supported image formats$/,
    note: 'Bitmap/image data URI scaling differs between Chromium and resvg in this environment.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: Image > should resolve the image size and scale automatically$/,
    note: 'Bitmap scaling behavior differs between Chromium and resvg in this environment.',
  },
  {
    pattern: /test\/image\.test\.tsx :: Image > should support styles$/,
    note: 'Image transform/filter pipeline differs between Chromium and resvg in this environment.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: Image > should not throw when image is not valid$/,
    note: 'Error fallback rendering differs between Chromium and resvg in this environment.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: background-image: url\(\) > should handle charset=utf-8 with comma in data$/,
    note: 'Data URI charset image parsing and rasterization differs between Chromium and resvg in this environment.',
  },
  {
    pattern:
      /test\/emoji\.test\.tsx :: Emojis > should detect emojis correctly$/,
    note: 'This verifies emoji-segmentation callbacks, not browser visual parity.',
  },
  {
    pattern: /test\/line-clamp\.test\.tsx :: Line Clamp >/,
    note: 'Satori lineClamp is a custom shorthand with non-browser clamping semantics.',
  },
  {
    pattern:
      /test\/table-layout\.test\.tsx :: Table Layout > should render mixed rowSpan and colSpan cells$/,
    note: 'Table span rendering currently uses equal track distribution; browser table border model differences are tracked separately from comparable cases.',
  },
  {
    pattern:
      /test\/table-layout\.test\.tsx :: Table Layout > should render text, background, and borders per spanned cell$/,
    note: 'Table span rendering currently uses equal track distribution; browser text/border distribution differences are tracked separately from comparable cases.',
  },
  {
    pattern: /test\/list-style\.test\.tsx/,
    note: 'List marker text/metrics rendering differs from Chromium/Resvg in this harness.',
  },
  {
    pattern: /test\/word-break\.test\.tsx/,
    note: 'Complex word-breaking behavior for Thai/complex scripts and emoji grapheme clusters differs from Chromium in this harness.',
  },
]

export function classifyComparability(testName: string): {
  comparable: boolean
  note?: string
} {
  const match = NON_COMPARABLE_CASES.find(({ pattern }) =>
    pattern.test(testName)
  )
  if (match) {
    return { comparable: false, note: match.note }
  }
  return { comparable: true }
}
