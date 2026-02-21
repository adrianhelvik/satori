import type { ParsedTransformOrigin } from '../transform-origin.js'
import type { TransformInput } from '../builder/transform.js'
import type { MaskProperty } from '../parser/mask.js'
import type { FontStyle, FontWeight } from '../font.js'

export type MainStyle = {
  color: string
  fontSize: number
  transform: TransformInput
  transformOrigin: ParsedTransformOrigin
  maskImage: MaskProperty[] | string
  opacity: number
  textTransform: string
  whiteSpace: string
  wordBreak: string
  hyphenateLimitChars: string
  textAlign: string
  textAlignLast: string
  textJustify: string
  lineHeight: number | string
  letterSpacing: number
  listStyleType: string
  listStylePosition: string
  listStyleImage: string
  counterReset: string
  counterIncrement: string
  counterSet: string

  fontFamily: string | string[]
  fontWeight: FontWeight
  fontStyle: FontStyle

  borderTopWidth: number
  borderLeftWidth: number
  borderRightWidth: number
  borderBottomWidth: number

  paddingTop: number
  paddingLeft: number
  paddingRight: number
  paddingBottom: number

  flexGrow: number
  flexShrink: number

  gap: number
  rowGap: number
  columnGap: number

  textShadowOffset: {
    width: number
    height: number
  }[]
  textShadowColor: string[]
  textShadowRadius: number[]
  cursor: string
  touchAction: string
  userSelect: string
  WebkitTextStrokeWidth: number
  WebkitTextStrokeColor: string
  textDecorationSkipInk: 'auto' | 'none' | 'all'
}

export type BackgroundClipPathRef = { value: string }

export type InternalStyle = {
  _viewportWidth: number
  _viewportHeight: number
  _inheritedClipPathId: string
  _inheritedMaskId: string
  _inheritedBackgroundClipTextPath: BackgroundClipPathRef
  _inheritedBackgroundClipTextHasBackground: 'true'
  _parentBackgroundColor: string
  _textUnderlineOffsetFromFont: number
  _textDecorationThicknessFromFont: number
  __src: string
  __srcWidth: number
  __srcHeight: number
}

export type StyleValue = string | number | object | undefined

export type SerializedStyle = Partial<MainStyle & InternalStyle> &
  Record<PropertyKey, StyleValue>
