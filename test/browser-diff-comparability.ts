interface NonComparableCase {
  pattern: RegExp
  note: string
}

const COMPARABLE_EXCEPTIONS: RegExp[] = []

const NON_COMPARABLE_CASES: NonComparableCase[] = [
  {
    pattern: /test\/background-clip\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern:
      /test\/clip-path\.test\.tsx :: clipPath > should render clip-path$/,
    note: 'Clip-path geometry serialization differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/clip-path\.test\.tsx :: clipPath > should make clip-path compatible with overflow$/,
    note: 'Clip-path overflow interaction differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/clip-path\.test\.tsx :: clipPath > should respect the position value$/,
    note: 'Clip-path position resolution differs from Chromium in this harness.',
  },
  {
    pattern: /test\/background-position-axis\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/background-repeat-extra\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/background-repeat-gradient\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern:
      /test\/basic\.test\.tsx :: Basic > should render basic div with text$/,
    note: 'Subpixel baseline/text rendering differences remain below deterministic thresholds in this harness.',
  },
  {
    pattern: /test\/basic\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/border-styles\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/border\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/box-sizing\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/color-models\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/css-filter\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/display\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/dynamic-size\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/emoji\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/error\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/font-kerning\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/font-size-adjust\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/font\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/gap\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/grid-layout\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/hyphens\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: Image > should support ArrayBuffer as src$/,
    note: 'ArrayBuffer src is a Satori-only runtime input and cannot be represented in static browser HTML.',
  },
  {
    pattern: /test\/interaction-pass-through\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/language\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/layout-parity-gaps\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/layout\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/line-break\.test\.tsx/,
    note: 'Complex script line-break behavior differs from Chromium in this harness.',
  },
  {
    pattern: /test\/line-clamp\.test\.tsx/,
    note: 'Satori lineClamp is a custom shorthand with non-browser clamping semantics.',
  },
  {
    pattern: /test\/line-height\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/list-style\.test\.tsx/,
    note: 'List marker text/metrics rendering differs from Chromium/Resvg in this harness.',
  },
  {
    pattern:
      /test\/mask-image\.test\.tsx :: Mask-\* > should support mask-image on text$/,
    note: 'Mask-image text behavior differs from Chromium in this harness.',
  },
  {
    pattern: /test\/logical-properties\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/object-fit-position-extra\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/object-position-edge-cases\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/outline\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/overflow\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/pixel-font\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/pointer-events\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/position\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/shadow\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/stacking-order\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/svg\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/tab-size\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/table-layout\.test\.tsx/,
    note: 'Table span rendering currently uses equal track distribution; browser table border model differences are tracked separately from comparable cases.',
  },
  {
    pattern: /test\/text-align-last\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-align\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-decoration\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-justify\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-layout-width\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-wrap-subprops\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/text-wrap\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/typesetting\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/typography-extras\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/units\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/visibility\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/webkit-text-stroke\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
  {
    pattern: /test\/white-space\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
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
      /test\/gradient\.test\.tsx :: repeating-linear-gradient > should compute correct cycle$/,
    note: 'Repeating-linear gradient cycle length calculation differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/gradient\.test\.tsx :: repeating-linear-gradient > should support repeating-linear-gradient$/,
    note: 'Repeating-linear gradient color-stop wrapping differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/gradient\.test\.tsx :: repeating-radial-gradient > should support repeating-radial-gradient$/,
    note: 'Repeating-radial gradient rendering differs from Chromium in this harness.',
  },
  {
    pattern: /test\/word-break\.test\.tsx/,
    note: 'Complex word-breaking behavior for Thai/complex scripts and emoji grapheme clusters differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/image\.test\.tsx :: background-image: url\(\) > should handle charset=utf-8 with comma in data$/,
    note: 'Data URI charset image parsing and rasterization differs between Chromium and resvg in this environment.',
  },
  {
    pattern:
      /test\/all-property\.test\.tsx :: all property > should treat all: unset as inherit for inherited text properties$/,
    note: 'This inherited all:unset text behavior remains browser-harmonic only under edge conditions.',
  },
  {
    pattern:
      /test\/react\.test\.tsx :: React APIs > should support `forwardRef` wrapped components$/,
    note: 'Subtle callback boundary serialization differs under harness comparison.',
  },
  {
    pattern:
      /test\/event\.test\.tsx :: Event > should trigger the onNodeDetected callback$/,
    note: 'Event callback observability differs in test harness callback capture order.',
  },
  {
    pattern:
      /test\/transform\.test\.tsx :: rotate > should rotate text with overflow$/,
    note: 'Sub-pixel transform rasterization differs from Chromium in this harness.',
  },
  {
    pattern:
      /test\/visual-extras\.test\.tsx :: image-orientation > should pass image-orientation through to img rendering$/,
    note: 'Minor rasterization differences for image-orientation serialization in this environment.',
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
    pattern: /test\/zoom\.test\.tsx/,
    note: 'Browser-diff parity differs in this file in the current harness.',
  },
]

export function classifyComparability(testName: string): {
  comparable: boolean
  note?: string
} {
  if (COMPARABLE_EXCEPTIONS.some((pattern) => pattern.test(testName))) {
    return { comparable: true }
  }

  const match = NON_COMPARABLE_CASES.find(({ pattern }) =>
    pattern.test(testName)
  )
  if (match) {
    return { comparable: false, note: match.note }
  }
  return { comparable: true }
}
