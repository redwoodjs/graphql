import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
import { getFragmentData, graphql } from "@/gql";
import { renderGraphqlPage } from "@/graphql.server";

const FindBlogPostQueryDocument = graphql(`
  query FindBlogPostQuery($id: Int!) {
    blogPost: post(id: $id) {
      ...BlogArticlePost
    }
  }
`);

type BlogPostPageProps = {
  readonly id: number;
};

const BlogPostPage = async ({ id }: BlogPostPageProps) =>
  renderGraphqlPage(
    FindBlogPostQueryDocument,
    { id },
    ({ blogPost }) => {
      const post = getFragmentData(BlogArticlePostFragment, blogPost);

      return post ? <BlogArticle post={post} /> : null;
    },
    {
      isEmpty: ({ blogPost }) => !blogPost,
    },
  );

export default BlogPostPage;
