import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
import { getFragmentData, graphql } from "@/gql";
import { renderGraphqlPage } from "@/graphql.server";
import { routes } from "@/routes";

const BlogPostsQueryDocument = graphql(`
  query BlogPostsQuery {
    blogPosts: posts {
      ...BlogArticlePost
    }
  }
`);

const HomePage = async () =>
  renderGraphqlPage(
    BlogPostsQueryDocument,
    undefined,
    ({ blogPosts }) => (
      <div className="divide-grey-700 divide-y">
        {blogPosts.map((post) => {
          const article = getFragmentData(BlogArticlePostFragment, post);

          return (
            <BlogArticle
              key={article.id}
              post={article}
              titleHref={routes.blogPost({ id: article.id })}
            />
          );
        })}
      </div>
    ),
    {
      isEmpty: ({ blogPosts }) => blogPosts.length === 0,
    },
  );

export default HomePage;
