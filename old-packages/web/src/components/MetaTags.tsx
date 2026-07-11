import React from 'react'

import * as helmetPkg from 'react-helmet-async'

const { Helmet: HelmetHead } = helmetPkg
// Ideally we wouldn't include this for non experiment builds
// But.... not worth the effort to remove it from bundle atm
import PortalHead from './PortalHead.js'

type RobotsParams =
  | 'noindex'
  | 'index'
  | 'follow'
  | 'nofollow'
  | 'none'
  | 'noarchive'
  | 'nocache'
  | 'nosnippet'
interface MetaTagsProps {
  /**
   * @description
   * og:image by default
   */
  tag?: `og:${string}`

  /**
   * @description
   * website by default. See https://ogp.me/#types
   */
  ogType?: string
  ogWidth?: string
  ogHeight?: string

  locale?: string

  /**
   * @description
   * Link to image/video to display when unfurled
   **/
  ogContentUrl?: string

  /**
   * @description
   * The url to link back to. This must be a canonical (absolute) URL.
   * Use `ogContentUrl` to set the actual image to be displayed
   **/
  ogUrl?: `${'http://' | 'https://'}${string}`
  contentType?: string

  /**
   * @description
   * String or array of strings to provide crawlers instructions for how to crawl or index web page content.
   **/
  robots?: RobotsParams | RobotsParams[]
  title?: string
  description?: string
  author?: string

  /**
   * @description
   * Any additional metatags
   */
  children?: React.ReactNode
}

/**
 * Add commonly used `<meta>` tags for unfurling/seo purposes
 * using the open graph protocol https://ogp.me/
 * @example
 * <MetaTags title="About Page" ogContentUrl="/static/about-og.png"/>
 * @deprecated Please use `<Metadata>` instead
 */
export const MetaTags = (props: MetaTagsProps) => {
  const {
    tag = 'og:image',
    ogType = 'website',
    ogContentUrl,
    robots,
    contentType,
    ogWidth,
    ogHeight,
    ogUrl,
    title,
    locale,
    description,
    author,
    children,
  } = props

  let Head: typeof HelmetHead | typeof PortalHead = HelmetHead

  if (RWJS_ENV.RWJS_EXP_STREAMING_SSR) {
    Head = PortalHead
  }

  return (
    <>
      {title && (
        <Head>
          <title>{title}</title>
          <meta property="og:title" content={title} key="title" />
          <meta property="twitter:title" content={title} />
        </Head>
      )}

      {description && (
        <Head>
          <meta name="description" content={description} />
          <meta name="twitter:description" content={description} />
          <meta property="og:description" content={description} />
        </Head>
      )}

      {author && (
        <Head>
          <meta name="author" content={author} />
          <meta name="twitter:site" content={author} />
          <meta name="twitter:creator" content={author} />
        </Head>
      )}

      {ogUrl && (
        <Head>
          <meta property="og:url" content={ogUrl} />
        </Head>
      )}

      {/* en_US by default */}
      {locale && (
        <Head>
          <html lang={locale} />
          <meta property="og:locale" content={locale} />
        </Head>
      )}

      <Head>
        <meta property="og:type" content={ogType} />
      </Head>

      {ogContentUrl && (
        <Head>
          <meta property={tag} content={ogContentUrl} />
        </Head>
      )}

      {contentType && (
        <Head>
          <meta property={`${tag}:type`} content={contentType} />
        </Head>
      )}

      {tag === 'og:image' && (
        <Head>
          {ogWidth && <meta property="image:width" content={ogWidth} />}
          {ogHeight && <meta property="image:height" content={ogHeight} />}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:image" content={ogContentUrl} />
        </Head>
      )}

      {robots && (
        <Head>
          <meta
            name="robots"
            content={Array.isArray(robots) ? robots.join(', ') : robots}
          />
        </Head>
      )}

      {children}
    </>
  )
}
