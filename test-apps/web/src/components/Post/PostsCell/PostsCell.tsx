"use client";

import { createCell } from "@rwgql/cell";

import { Link } from "@rwgql/router";
import { routes } from "@/routes";
import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";

import Posts from "@/components/Post/Posts/Posts";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const FindPostsDocument = graphql(`
  query FindPosts {
    posts {
      id
      title
      body
      authorId
      createdAt
    }
  }
`);

export const QUERY = FindPostsDocument;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => {
  return (
    <div className="rw-text-center">
      No posts yet.{" "}
      <Link to={routes.newPost()} className="rw-link">
        Create one?
      </Link>
    </div>
  );
};

export const Failure = ({ error }: CellFailureProps<VariablesOf<typeof FindPostsDocument>>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  posts,
}: CellSuccessProps<ResultOf<typeof FindPostsDocument>, VariablesOf<typeof FindPostsDocument>>) => {
  return <Posts posts={posts} />;
};

export default createCell<
  ResultOf<typeof FindPostsDocument>,
  VariablesOf<typeof FindPostsDocument>
>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
