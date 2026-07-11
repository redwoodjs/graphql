import { graphql } from "@/gql";
import type { ResultOf } from "@graphql-typed-document-node/core";

export const BlogArticlePostFragment = graphql(`
  fragment BlogArticlePost on Post {
    id
    title
    body
    createdAt
    author {
      email
      fullName
    }
  }
`);

export type BlogArticlePost = ResultOf<typeof BlogArticlePostFragment>;

type BlogArticleProps = {
  readonly post: BlogArticlePost;
  readonly titleHref?: string;
};

const formatCreatedAt = (createdAt: string) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));

const AuthorLine = ({ author }: { readonly author: NonNullable<BlogArticlePost["author"]> }) => (
  <span>
    {author.fullName} ({author.email})
  </span>
);

const BlogArticle = ({ post, titleHref }: BlogArticleProps) => (
  <article>
    <header className="mt-4">
      <p className="text-sm">
        {formatCreatedAt(post.createdAt)} - By:{" "}
        {post.author ? <AuthorLine author={post.author} /> : "Unknown author"}
      </p>
      <h2 className="mt-2 text-xl font-semibold">
        {titleHref ? (
          <a className="hover:text-blue-600" href={titleHref}>
            {post.title}
          </a>
        ) : (
          post.title
        )}
      </h2>
    </header>
    <div className="mb-4 mt-2 font-light text-gray-900">{post.body}</div>
  </article>
);

export default BlogArticle;
