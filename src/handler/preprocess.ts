import type { ReactElement, ReactNode } from 'react'
import { resolveImageData, cache } from './image.js'
import { isReactElement, parseViewBox, midline } from '../utils.js'

// Based on
// https://raw.githubusercontent.com/facebook/react/master/packages/react-dom/src/shared/possibleStandardNames.js
const ATTRIBUTE_MAPPING = {
  accentHeight: 'accent-height',
  alignmentBaseline: 'alignment-baseline',
  arabicForm: 'arabic-form',
  baselineShift: 'baseline-shift',
  capHeight: 'cap-height',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  colorProfile: 'color-profile',
  colorRendering: 'color-rendering',
  dominantBaseline: 'dominant-baseline',
  enableBackground: 'enable-background',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontSizeAdjust: 'font-size-adjust',
  fontStretch: 'font-stretch',
  fontStyle: 'font-style',
  fontVariant: 'font-variant',
  fontWeight: 'font-weight',
  glyphName: 'glyph-name',
  glyphOrientationHorizontal: 'glyph-orientation-horizontal',
  glyphOrientationVertical: 'glyph-orientation-vertical',
  horizAdvX: 'horiz-adv-x',
  horizOriginX: 'horiz-origin-x',
  href: 'href',
  imageRendering: 'image-rendering',
  letterSpacing: 'letter-spacing',
  lightingColor: 'lighting-color',
  markerHeight: 'marker-height',
  markerUnits: 'marker-units',
  markerWidth: 'marker-width',
  markerEnd: 'marker-end',
  markerMid: 'marker-mid',
  markerStart: 'marker-start',
  overlinePosition: 'overline-position',
  overlineThickness: 'overline-thickness',
  paintOrder: 'paint-order',
  panose1: 'panose-1',
  pointerEvents: 'pointer-events',
  renderingIntent: 'rendering-intent',
  shapeRendering: 'shape-rendering',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  strikethroughPosition: 'strikethrough-position',
  strikethroughThickness: 'strikethrough-thickness',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  strokeWidth: 'stroke-width',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  textRendering: 'text-rendering',
  underlinePosition: 'underline-position',
  underlineThickness: 'underline-thickness',
  unicodeBidi: 'unicode-bidi',
  unicodeRange: 'unicode-range',
  unitsPerEm: 'units-per-em',
  vAlphabetic: 'v-alphabetic',
  vHanging: 'v-hanging',
  vIdeographic: 'v-ideographic',
  vMathematical: 'v-mathematical',
  vectorEffect: 'vector-effect',
  vertAdvY: 'vert-adv-y',
  vertOriginX: 'vert-origin-x',
  vertOriginY: 'vert-origin-y',
  wordSpacing: 'word-spacing',
  writingMode: 'writing-mode',
  xHeight: 'x-height',
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  xmlnsXlink: 'xmlns:xlink',
} as const

// From https://github.com/yoksel/url-encoder/blob/master/src/js/script.js
const SVGSymbols = /[\r\n%#()<>?[\\\]^`{|}"']/g
const MARKER_STYLE_PROPERTIES = {
  markerStart: 'marker-start',
  markerMid: 'marker-mid',
  markerEnd: 'marker-end',
  'marker-start': 'marker-start',
  'marker-mid': 'marker-mid',
  'marker-end': 'marker-end',
} as const
const MARKER_ATTRIBUTE_PROP_KEYS = {
  'marker-start': ['markerStart', 'marker-start'],
  'marker-mid': ['markerMid', 'marker-mid'],
  'marker-end': ['markerEnd', 'marker-end'],
} as const

function translateSVGNodeToSVGString(
  node: ReactElement | string | (ReactElement | string)[],
  inheritedColor: string
): string {
  if (!node) return ''
  if (Array.isArray(node)) {
    return node
      .map((n) => translateSVGNodeToSVGString(n, inheritedColor))
      .join('')
  }
  if (typeof node !== 'object') return String(node)

  const type = node.type
  if (type === 'text') {
    throw new Error(
      '<text> nodes are not currently supported, please convert them to <path>'
    )
  }

  const { children, style, ...restProps } = node.props || {}
  const currentColor = style?.color || inheritedColor

  const parsedStyle = style
    ? Object.entries(style).reduce(
        (result, [key, value]) => {
          const markerAttr =
            MARKER_STYLE_PROPERTIES[key as keyof typeof MARKER_STYLE_PROPERTIES]

          if (markerAttr) {
            const explicitMarkerPropKeys =
              MARKER_ATTRIBUTE_PROP_KEYS[markerAttr]
            const hasExplicitMarkerProp = explicitMarkerPropKeys.some(
              (propKey) =>
                Object.prototype.hasOwnProperty.call(restProps, propKey)
            )

            if (
              !hasExplicitMarkerProp &&
              !Object.prototype.hasOwnProperty.call(restProps, key)
            ) {
              result.markerStyleAttributes[markerAttr] = value
            }
          } else {
            result.styleEntries.push([key, value])
          }

          return result
        },
        {
          styleEntries: [] as [string, any][],
          markerStyleAttributes: {} as Record<string, any>,
        }
      )
    : {
        styleEntries: [] as [string, any][],
        markerStyleAttributes: {} as Record<string, any>,
      }

  const attrs = `${Object.entries(restProps)
    .map(([k, _v]) => {
      if (typeof _v === 'string' && _v.toLowerCase() === 'currentcolor') {
        _v = currentColor
      }

      if (k === 'href' && type === 'image') {
        return ` ${ATTRIBUTE_MAPPING[k] || k}="${cache.get(_v as string)[0]}"`
      }
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${_v}"`
    })
    .concat(
      Object.entries(parsedStyle.markerStyleAttributes).map(
        ([k, v]) => ` ${k}="${v}"`
      )
    )
    .join('')}`

  const styles = style
    ? ` style="${parsedStyle.styleEntries
        .map(([k, _v]) => `${midline(k)}:${_v}`)
        .join(';')}"`
    : ''

  return `<${type}${attrs}${styles}>${translateSVGNodeToSVGString(
    children,
    currentColor
  )}</${type}>`
}
/**
 * pre process node and resolve absolute link to img data for image element
 * @param node ReactNode
 * @returns
 */
export async function preProcessNode(node: ReactNode) {
  const set = new Set<string | Buffer | ArrayBuffer>()
  const walk = (_node: ReactNode) => {
    if (!_node) return
    if (!isReactElement(_node)) return

    if (Array.isArray(_node)) {
      _node.forEach((v) => walk(v))
      return
    } else if (typeof _node === 'object') {
      if (_node.type === 'image') {
        if (set.has(_node.props.href)) {
          // do nothing
        } else {
          set.add(_node.props.href)
        }
      } else if (_node.type === 'img') {
        if (set.has(_node.props.src)) {
          // do nothing
        } else {
          set.add(_node.props.src)
        }
      } else {
        // do nothing
      }
    }

    Array.isArray(_node.props.children)
      ? _node.props.children.map((c) => walk(c))
      : walk(_node.props.children)
  }

  walk(node)

  return Promise.all(Array.from(set).map((s) => resolveImageData(s)))
}

export async function SVGNodeToImage(
  node: ReactElement,
  inheritedColor: string,
  renderedWidth?: number,
  renderedHeight?: number
): Promise<string> {
  let {
    viewBox,
    viewbox,
    width,
    height,
    className,
    style,
    children,
    ...restProps
  } = node.props || {}

  viewBox ||= viewbox

  // We directly assign the xmlns attribute here to deduplicate.
  restProps.xmlns = 'http://www.w3.org/2000/svg'

  const currentColor = style?.color || inheritedColor
  const viewBoxSize = parseViewBox(viewBox)

  const hasRenderedSize =
    typeof renderedWidth === 'number' &&
    Number.isFinite(renderedWidth) &&
    typeof renderedHeight === 'number' &&
    Number.isFinite(renderedHeight)

  if (hasRenderedSize) {
    width = renderedWidth
    height = renderedHeight
  } else {
    // ratio = height / width
    const ratio = viewBoxSize ? viewBoxSize[3] / viewBoxSize[2] : null
    const hasRatio =
      typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0

    if (
      hasRatio &&
      typeof width === 'undefined' &&
      typeof height === 'number'
    ) {
      width = height / ratio
    } else if (
      hasRatio &&
      typeof height === 'undefined' &&
      typeof width === 'number'
    ) {
      height = width * ratio
    }
  }

  if (typeof width !== 'undefined' && width !== null) restProps.width = width
  if (typeof height !== 'undefined' && height !== null)
    restProps.height = height
  if (viewBox) restProps.viewBox = viewBox

  return `data:image/svg+xml;utf8,${`<svg ${Object.entries(restProps)
    .map(([k, _v]) => {
      if (typeof _v === 'string' && _v.toLowerCase() === 'currentcolor') {
        _v = currentColor
      }
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${_v}"`
    })
    .join('')}>${translateSVGNodeToSVGString(
    children,
    currentColor
  )}</svg>`.replace(SVGSymbols, encodeURIComponent)}`
}
