'use client'

import React from 'react'

import * as helmetPkg from 'react-helmet-async'

const { Helmet: HelmetHead } = helmetPkg

// Ideally we wouldn't include this for non experiment builds
// But.... not worth the effort to remove it from bundle atm
import PortalHead from './PortalHead.js'

type ValueOrCollection<T> = T | ValueOrCollection<T>[] | Record<string, T>
type ParentValue = ValueOrCollection<string>

const EXCLUDE_PROPS = ['charSet']

const propToMetaTag = (
  parentKey: string,
  parentValue: ParentValue,
  options: { attr: 'name' | 'property' },
): JSX.Element | JSX.Element[] => {
  if (Array.isArray(parentValue)) {
    // array of attributes
    return parentValue.flatMap((value) => {
      return propToMetaTag(parentKey, value, options)
    })
  } else if (typeof parentValue === 'object') {
    // namespaced attributes, <meta> name attribute changes to 'property'
    return Object.entries(parentValue)
      .filter(([_, v]) => v !== null)
      .flatMap(([key, value]) => {
        return propToMetaTag(`${parentKey}:${key}`, value, { attr: 'property' })
      })
  } else {
    // plain text
    const attributes = {
      [options['attr']]: parentKey,
      content: parentValue,
    }
    return <meta {...attributes} />
  }
}

/**
 * Add commonly used `<meta>` tags for unfurling/seo purposes
 * using the open graph protocol https://ogp.me/
 * @example
 * <Metadata title="About Page" og={{ image: "/static/about-og.png" }} />
 */
export const Metadata = (props: Record<string, any>) => {
  const { children, ...metaProps } = props

  let Head: typeof HelmetHead | typeof PortalHead = HelmetHead

  if (RWJS_ENV.RWJS_EXP_STREAMING_SSR) {
    Head = PortalHead
  }

  const tags: JSX.Element[] = Object.entries(metaProps)
    .filter(
      ([key, value]) =>
        !EXCLUDE_PROPS.includes(key) &&
        value !== null &&
        (key !== 'og' || value !== true),
    )
    .flatMap(([key, value]) => {
      return propToMetaTag(key, value, { attr: 'name' })
    })
    .filter((tag) => !!tag)

  // custom overrides
  if (metaProps.title) {
    ;[metaProps.title]
      .flat()
      .reverse()
      .map((title) => {
        tags.unshift(<title>{title}</title>)
      })
  }

  if (metaProps.charSet) {
    tags.push(<meta charSet={metaProps.charSet} />)
  }

  if (metaProps.og) {
    // add title and og:title
    if (metaProps.title && !metaProps.og.title && metaProps.og.title !== null) {
      tags.push(<meta property="og:title" content={metaProps.title} />)
    }

    // add og:description
    if (
      metaProps.description &&
      !metaProps.og.description &&
      metaProps.og.description !== null
    ) {
      tags.push(
        <meta property="og:description" content={metaProps.description} />,
      )
    }

    // add og:type
    if (!metaProps.og.type && metaProps.og.type !== null) {
      tags.push(<meta property="og:type" content="website" />)
    }
  }

  return (
    <Head>
      {tags.map((tag, i) => React.cloneElement(tag, { key: i }))}
      {children}
    </Head>
  )
}
