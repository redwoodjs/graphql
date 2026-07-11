import React from 'react'
import { Fragment } from 'react'

declare const window: {
  __REDWOOD__ASSET_MAP: {
    css?: string[]
    meta?: TagDescriptor[]
  }
} & Window

const extractCssFromAssetMap = () => {
  if (typeof window !== 'undefined') {
    return window.__REDWOOD__ASSET_MAP?.css
  }

  return undefined
}

const extractMetaFromAssetMap = () => {
  if (typeof window !== 'undefined') {
    return window.__REDWOOD__ASSET_MAP?.meta
  }

  return undefined
}

function addSlashIfNeeded(path: string): string {
  if (path.startsWith('http') || path.startsWith('/')) {
    return path
  } else {
    return '/' + path
  }
}

/** CSS is a specialised metatag */
export const Css = ({ css }: { css: string[] }) => {
  const cssLinks = (css || extractCssFromAssetMap() || []).map(addSlashIfNeeded)

  return (
    <>
      {cssLinks.map((cssLink, index) => {
        return (
          <link rel="stylesheet" key={`css-${index}`} href={`${cssLink}`} />
        )
      })}
    </>
  )
}

/**
 * <title>My Page</title>
 */
interface Title {
  title: string
}

/**
 * <meta name="author" content="Chris Mills" />
 */
interface NameContent {
  name: string
  content: string
}

/**
 * <meta property="og:image"
 * content="https://.../opengraph-logo.png" />
 */
interface OpenGraph {
  property: string
  content: string
}

/**
 * <meta http-equiv="refresh" content="30">
 */
interface HttpEquiv {
  httpEquiv: string
  content: string
}

/***
 * <meta some-attribute="some-value" />
 */
interface Custom {
  [name: string]: unknown
}

/**
 * <link rel="canonical" href="https://example.com" />
 */
interface Other extends Custom {
  tagType: string // link, script, etc
}

// @MARK Maintaining a similar format to Remix's V2_MetaDescriptor
// 1. because I (Danny) like it
// 2. because it'll feel consistent to people who are familiar with Remix
// I've modified it a little bit, but we need to decide wether we want the
// remix style DIY meta tags, or the more opinionated approach in MetaTags.tsx
export type TagDescriptor =
  | Title
  // TODO (STREAMING) Not sure why we need these, maybe just for ease of use
  | NameContent
  | OpenGraph
  | HttpEquiv
  // ------------------------
  | Custom
  | Other

interface MetaProps {
  tags: TagDescriptor[] | undefined
}

export const Meta = ({ tags }: MetaProps) => {
  const metaTags = tags || extractMetaFromAssetMap() || []

  return (
    <>
      {metaTags.map((tag, index) => {
        if (!tag) {
          return null
        }

        if (isTitleTag(tag)) {
          return (
            <Fragment key="title">
              <title>{tag.title}</title>
              <meta property="og:title" content={tag.title} />
            </Fragment>
          )
        }

        // TODO (STREAMING) add validate tag function
        if (otherTag(tag)) {
          const { tagType: TagName, ...rest } = tag
          return <TagName key={`meta-${index}`} {...rest} />
        }

        return <meta key={`meta-${index}`} {...tag} />
      })}
    </>
  )
}

const isTitleTag = (tag: TagDescriptor): tag is Title => {
  return 'title' in tag
}

// Not a "<meta>" tag
const otherTag = (tag: TagDescriptor): tag is Other => {
  return 'tagType' in tag
}
