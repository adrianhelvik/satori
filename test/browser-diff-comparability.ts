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
