import type { ParsedTransformOrigin } from '../transform-origin.js'
import type { TransformInput } from '../builder/transform.js'
import type { MaskProperty } from '../parser/mask.js'
import type { FontStyle, FontWeight } from '../font.js'

export type MainStyle = {
  // Typography
  color: string
  fontSize: number
  fontSizeAdjust: number | string
  fontFamily: string | string[]
  fontWeight: FontWeight
  fontStyle: FontStyle
  fontVariant: string | string[]
  fontVariantCaps: string
  fontVariantPosition: string
  fontKerning: string
  lineHeight: number | string
  letterSpacing: number
  wordSpacing: number
  textAlign: string
  textAlignLast: string
  textJustify: string
  textTransform: string
  textWrap: string
  textIndent: string | number
  tabSize: number | string
  whiteSpace: string
  wordBreak: string
  overflowWrap: string
  lineBreak: string
  hyphens: string
  hyphenateCharacter: string
  hyphenateLimitChars: string

  // Text decoration
  textDecorationLine: string
  textDecorationColor: string
  textDecorationStyle: string
  textDecorationThickness: string | number
  textDecorationSkipInk: 'auto' | 'none' | 'all'
  textUnderlineOffset: string | number
  textUnderlinePosition: string

  // Text shadow
  textShadowOffset: {
    width: number
    height: number
  }[]
  textShadowColor: string[]
  textShadowRadius: number[]

  // Text stroke
  WebkitTextStrokeWidth: number
  WebkitTextStrokeColor: string

  // Box model — sizing
  width: number | string
  height: number | string
  minWidth: number | string
  maxWidth: number | string
  minHeight: number | string
  maxHeight: number | string
  boxSizing: string
  aspectRatio: number | string

  // Box model — margin
  marginTop: number | string
  marginRight: number | string
  marginBottom: number | string
  marginLeft: number | string

  // Box model — padding
  paddingTop: number
  paddingLeft: number
  paddingRight: number
  paddingBottom: number

  // Box model — border widths
  borderTopWidth: number
  borderLeftWidth: number
  borderRightWidth: number
  borderBottomWidth: number

  // Border colors
  borderTopColor: string
  borderRightColor: string
  borderBottomColor: string
  borderLeftColor: string

  // Border styles
  borderTopStyle: string
  borderRightStyle: string
  borderBottomStyle: string
  borderLeftStyle: string

  // Border radius
  borderTopLeftRadius: number | string
  borderTopRightRadius: number | string
  borderBottomRightRadius: number | string
  borderBottomLeftRadius: number | string

  // Outline
  outlineColor: string
  outlineOffset: number | string
  outlineStyle: string
  outlineWidth: number | string

  // Flexbox
  display: string
  flexDirection: string
  flexWrap: string
  flexBasis: number | string
  flexGrow: number
  flexShrink: number
  alignItems: string
  alignContent: string
  alignSelf: string
  justifyContent: string
  gap: number
  rowGap: number
  columnGap: number

  // Positioning
  position: string
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string

  // Visual
  opacity: number
  visibility: string
  overflow: string
  overflowX: string
  overflowY: string
  overflowClipMargin: string | number
  overflowClipMarginBox: string

  // Backgrounds
  backgroundColor: string
  backgroundImage: string
  backgroundClip: string
  backgroundBlendMode: string
  backgroundPosition: string
  backgroundPositionX: string
  backgroundPositionY: string
  backgroundRepeat: string
  backgroundSize: string
  backgroundOrigin: string

  // Text overflow
  textOverflow: string
  lineClamp: number
  WebkitLineClamp: number
  WebkitBoxOrient: string

  // Direction
  direction: string
  unicodeBidi: string

  // Clip & mask
  clipPath: string
  maskImage: MaskProperty[] | string
  maskType: string
  WebkitMaskImage: string

  // Transform
  transform: TransformInput
  transformOrigin: ParsedTransformOrigin
  perspective: number | string
  contain: string
  willChange: string

  // Filter
  filter: string

  // Shadow
  boxShadow: string
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowRadius: number

  // Image
  objectFit: string
  objectPosition: string
  imageRendering: string
  imageOrientation: string

  // Visual effects
  mixBlendMode: string
  isolation: string
  zoom: number | string

  // Interaction
  cursor: string
  touchAction: string
  userSelect: string
  pointerEvents: string

  // List
  listStyleType: string
  listStylePosition: string
  listStyleImage: string
  counterReset: string
  counterIncrement: string
  counterSet: string
}

export type InternalStyle = {
  _viewportWidth: number
  _viewportHeight: number
  __src: string
  __srcWidth: number
  __srcHeight: number
}

export type StyleValue = string | number | object | undefined

export type SerializedStyle = Partial<MainStyle & InternalStyle>
