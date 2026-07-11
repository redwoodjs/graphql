import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
import { getFragmentData, graphql } from "@/gql";
import { renderGraphqlPage } from "@/graphql.server";

const FindWaterfallBlogPostQueryDocument = graphql(`
  query FindWaterfallBlogPostQuery($id: Int!) {
    waterfallBlogPost: post(id: $id) {
      ...BlogArticlePost
    }
  }
`);

type WaterfallPageProps = {
  readonly id: number;
};

const WaterfallPage = async ({ id }: WaterfallPageProps) =>
  renderGraphqlPage(
    FindWaterfallBlogPostQueryDocument,
    { id },
    ({ waterfallBlogPost }) => {
      const post = getFragmentData(BlogArticlePostFragment, waterfallBlogPost);

      return post ? <BlogArticle post={post} /> : null;
    },
    {
      isEmpty: ({ waterfallBlogPost }) => !waterfallBlogPost,
    },
  );

export default WaterfallPage;
