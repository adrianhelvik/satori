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
