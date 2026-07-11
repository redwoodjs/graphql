import { useLocation } from '@redwoodjs/router'

export type OgImageUrlOptions = {
  extension?: 'png' | 'jpg'
  width?: number
  height?: number
  quality?: number
  searchParams?: URLSearchParams | Record<string, string>
}

export const OGIMAGE_DEFAULTS = {
  extension: 'png',
  width: 1200,
  height: 630,
  quality: 100,
}

export const useOgImage = (options?: OgImageUrlOptions) => {
  const { origin, pathname, searchParams: locationSearchParams } = useLocation()
  const ext = options?.extension || OGIMAGE_DEFAULTS.extension
  const width = options?.width
  const height = options?.height
  const quality = options?.quality
  const searchParams =
    options?.searchParams instanceof URLSearchParams
      ? options?.searchParams
      : new URLSearchParams(options?.searchParams || {})
  const outputSearchParams = new URLSearchParams({
    ...Object.fromEntries(locationSearchParams),
    ...Object.fromEntries(searchParams),
  })

  const output = [origin]

  // special case if we're at the root, image is available at /index.ext
  if (pathname === '/') {
    output.push('/index')
  } else {
    output.push(pathname)
  }

  output.push(`.${ext}`)

  if (width) {
    outputSearchParams.append('width', width.toString())
  }
  if (height) {
    outputSearchParams.append('height', height.toString())
  }
  if (quality) {
    outputSearchParams.append('quality', quality.toString())
  }

  // only append search params if there are any, so we don't up with a trailing `?`
  if (outputSearchParams.size) {
    output.push(`?${outputSearchParams}`)
  }

  return {
    url: output.join(''),
    width: width || OGIMAGE_DEFAULTS.width,
    height: height || OGIMAGE_DEFAULTS.height,
    quality: quality || OGIMAGE_DEFAULTS.quality,
    extension: ext,
    ogProps: {
      image: [
        output.join(''),
        {
          width: width || OGIMAGE_DEFAULTS.width,
          height: height || OGIMAGE_DEFAULTS.height,
        },
      ],
      // TODO: Haven't determined if this is required for Twitter to pick up the og:image. Needs some testing.
      // twitter: { image: { src: output.join('') } },
    },
  }
}
