import type * as PresetClassic from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'

import autoImportTabs from './src/remark/auto-import-tabs.mjs'
import fileExtSwitcher from './src/remark/file-ext-switcher.mjs'

const config: Config = {
  customFields: {
    defaultDocsLandingPage: 'index', // redirects here when hitting /docs/
    defaultSectionLandingPages: {
      // map of what is considered the first article in each section
      // section: id
      tutorial: 'forward',
    },
  },
  // ?
  title: 'RedwoodJS Docs',
  // ?
  tagline:
    'Built on React, GraphQL, and Prisma, Redwood works with the components and development workflow you love, but with simple conventions and helpers to make your experience even better.',
  // ?
  url: 'https://docs.redwoodjs.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'https://redwoodjs.com/favicon.png',
  organizationName: 'redwoodjs', // Usually your GitHub org/user name.
  // ?
  projectName: 'redwood', // Usually your repo name.,
  themeConfig: {
    algolia: {
      appId: '37B3LHULK0',
      apiKey: '1d7f2f299d9a38c157501c301425f090',
      indexName: 'learn-redwood',
      contextualSearch: true,
      searchParameters: {},
      // externalUrlRegex: 'https://learn-redwood.netlify.app',
    },
    announcementBar: {
      id: 'sdk_announcement',
      content:
        '<a target="_blank" rel="noopener noreferrer" href="https://rwsdk.com" style="font-weight: bold;">RedwoodSDK is now available!</a>',
      backgroundColor: '#c4f482',
      textColor: '#000000',
      isCloseable: false,
    },
    navbar: {
      title: 'RedwoodJS',
      logo: {
        alt: 'RedwoodJS pinecone logo',
        src: 'https://d33wubrfki0l68.cloudfront.net/72b0d56596a981835c18946d6c4f8a968b08e694/82254/images/logo.svg',
        href: 'https://docs.redwoodjs.com/',
        target: '_self',
      },
      items: [
        {
          type: 'docsVersionDropdown',
          position: 'left',
        },
        {
          href: 'https://github.com/redwoodjs/redwood',
          position: 'right',
          className: 'github-logo',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    prism: {
      additionalLanguages: ['toml', 'diff', 'bash', 'json'],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: 'docs/tutorial/foreword',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.com/invite/redwoodjs',
            },
            {
              label: 'Discourse',
              href: 'https://community.redwoodjs.com/',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/redwoodjs',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'redwoodjs.com',
              to: 'https://redwoodjs.com/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/redwoodjs/redwood',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RedwoodJS. Built with Docusaurus.`,
    },
  } satisfies PresetClassic.ThemeConfig,
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // ? — blob? tree?
          editUrl: 'https://github.com/redwoodjs/redwood/blob/main/docs', // base path for repo edit pages
          editCurrentVersion: true,
          remarkPlugins: [autoImportTabs, fileExtSwitcher],
          versions: {
            current: {
              label: 'Canary',
              path: 'canary',
              banner: 'unreleased',
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies PresetClassic.Options,
    ],
  ],
  // ?
  scripts: [
    {
      src: 'https://plausible.io/js/script.outbound-links.tagged-events.js',
      defer: true,
      'data-domain': 'docs.redwoodjs.com',
    },
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;900&display=swap',
  ],
}

export default config
