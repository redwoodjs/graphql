import type { ReactElement, ReactNode } from "react";
import { Fragment, isValidElement } from "react";
import type { RenderToStreamOptions } from "rwsdk/worker";

import { registerApolloRwsdkHtmlInsertion } from "./stream-context.shared.js";
import type { ApolloRwsdkHtmlInsertion } from "./stream-context.shared.js";

export type ApolloRwsdkRenderToStreamOptions = RenderToStreamOptions & {
  readonly transportId: string;
};

export const renderApolloRwsdkStream = async (
  element: ReactElement,
  { transportId, ...renderOptions }: ApolloRwsdkRenderToStreamOptions,
) => {
  const { injectIntoStream, transformStream } = createApolloRwsdkInjectionTransformStream();
  const unregister = registerApolloRwsdkHtmlInsertion({
    transportId,
    insertHtml: injectIntoStream,
  });

  try {
    const worker = await import("rwsdk/worker");
    const stream = await worker.renderToStream(element, renderOptions);
    return stream.pipeThrough(transformStream).pipeThrough(
      new TransformStream({
        flush() {
          unregister();
        },
      }),
    );
  } catch (error) {
    unregister();
    throw error;
  }
};

const createApolloRwsdkInjectionTransformStream = (): {
  readonly injectIntoStream: (render: ApolloRwsdkHtmlInsertion) => void;
  readonly transformStream: TransformStream<Uint8Array, Uint8Array>;
} => {
  let queuedInjections: ApolloRwsdkHtmlInsertion[] = [];

  const renderInjectedHtml = () => {
    const injections = queuedInjections;
    queuedInjections = [];

    return injections.map((render) => renderReactNodeToHtml(render())).join("");
  };

  let headInserted = false;
  let currentlyStreaming = false;
  let tailOfLastChunk = "";
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  const headEnd = "</head>";
  const keepBytes = headEnd.length;

  return {
    injectIntoStream: (render) => {
      queuedInjections.push(render);
    },
    transformStream: new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (currentlyStreaming) {
          controller.enqueue(chunk);
          return;
        }

        if (!headInserted) {
          const content = tailOfLastChunk + textDecoder.decode(chunk, { stream: true });
          const headEndIndex = content.indexOf(headEnd);

          if (headEndIndex === -1) {
            tailOfLastChunk = content.slice(-keepBytes);
            controller.enqueue(textEncoder.encode(content.slice(0, -keepBytes)));
            return;
          }

          tailOfLastChunk = "";
          controller.enqueue(
            textEncoder.encode(
              content.slice(0, headEndIndex) + renderInjectedHtml() + content.slice(headEndIndex),
            ),
          );
          headInserted = true;
        } else {
          if (queuedInjections.length > 0) {
            controller.enqueue(textEncoder.encode(renderInjectedHtml()));
          }

          controller.enqueue(chunk);
        }

        currentlyStreaming = true;
        queueMicrotask(() => {
          currentlyStreaming = false;
        });
      },
      flush(controller) {
        if (tailOfLastChunk) {
          controller.enqueue(textEncoder.encode(tailOfLastChunk));
        }

        if (queuedInjections.length > 0) {
          controller.enqueue(textEncoder.encode(renderInjectedHtml()));
        }
      },
    }),
  };
};

type ScriptElementProps = {
  readonly children?: ReactNode;
  readonly dangerouslySetInnerHTML?: {
    readonly __html: string;
  };
  readonly nonce?: string;
  readonly type?: string;
};

const renderReactNodeToHtml = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node));
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderReactNodeToHtml(child)).join("");
  }

  if (isValidElement<ScriptElementProps>(node)) {
    if (node.type === Fragment || String(node.type) === "Symbol(react.fragment)") {
      return renderReactNodeToHtml(node.props.children);
    }

    if (typeof node.type === "function") {
      const Component = node.type as (props: ScriptElementProps) => ReactNode;
      return renderReactNodeToHtml(Component(node.props));
    }

    if (node.type !== "script") {
      throw new Error("Apollo RWSDK stream insertions must render script tags.");
    }

    const inlineScript = node.props.dangerouslySetInnerHTML?.__html;
    const children = inlineScript ?? renderReactNodeToHtml(node.props.children);

    return `<script${renderScriptAttributes(node.props)}>${children}</script>`;
  }

  if (typeof node === "object" && Symbol.iterator in node) {
    return Array.from(node as Iterable<ReactNode>)
      .map((child) => renderReactNodeToHtml(child))
      .join("");
  }

  return "";
};

const renderScriptAttributes = ({ nonce, type }: ScriptElementProps) => {
  const attributes: string[] = [];

  if (nonce !== undefined) {
    attributes.push(`nonce="${escapeAttribute(nonce)}"`);
  }

  if (type !== undefined) {
    attributes.push(`type="${escapeAttribute(type)}"`);
  }

  return attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const escapeAttribute = (value: string) => escapeHtml(value).replaceAll('"', "&quot;");
