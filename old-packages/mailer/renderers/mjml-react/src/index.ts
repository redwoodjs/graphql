import { renderToMjml } from '@faire/mjml-react/utils/renderToMjml'
import mjml2html from 'mjml'

import type {
  MailRenderedContent,
  MailUtilities,
  MailRendererOptions,
} from '@redwoodjs/mailer-core'
import { AbstractMailRenderer } from '@redwoodjs/mailer-core'

export type SupportedOutputFormats = 'html'
export type RendererOptions = MailRendererOptions<SupportedOutputFormats> &
  Parameters<typeof mjml2html>[1]

export class MJMLReactRenderer extends AbstractMailRenderer {
  render(
    template: Parameters<typeof renderToMjml>[0],
    options: RendererOptions,
    _utilities?: MailUtilities,
  ): MailRenderedContent {
    const renderingResult = mjml2html(renderToMjml(template), options)
    if (renderingResult.errors.length > 0) {
      throw new Error(renderingResult.errors.join('\n'))
    }
    return { html: renderingResult.html, text: '' }
  }

  // Nothing interal to expose
  internal(): Record<string, unknown> {
    return {}
  }
}
