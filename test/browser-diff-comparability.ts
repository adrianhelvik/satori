interface NonComparableCase {
  pattern: RegExp
  note: string
}

const COMPARABLE_EXCEPTIONS: RegExp[] = []

const NON_COMPARABLE_CASES: NonComparableCase[] = []

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
