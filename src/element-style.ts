import type { ReactNode } from 'react'
import { isReactElement } from './utils.js'

export type TwStyleResolver = (
  tw: string,
  style: Record<string, unknown> | undefined
) => Record<string, unknown>

export function resolveElementStyle(
  child: ReactNode,
  getTwStyles: TwStyleResolver
): Record<string, unknown> | undefined {
  if (!isReactElement(child) || typeof child.type !== 'string') return

  const childProps = child.props || {}
  let childStyle = childProps.style as Record<string, unknown> | undefined

  if (childProps.tw) {
    const twStyles = getTwStyles(childProps.tw as string, childStyle)
    childStyle = Object.assign(twStyles, childStyle)
  }

  return childStyle
}
